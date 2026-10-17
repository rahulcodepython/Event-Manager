// Package idcard renders an applicant's ID card as a one-page PDF. Cards
// are generated on demand and never stored.
package idcard

import (
    "bytes"
    "context"
    "fmt"
    "io"
    "net/http"
    "strings"
    "time"

    "github.com/go-pdf/fpdf"
    "github.com/skip2/go-qrcode"
    "golang.org/x/image/font/gofont/gobold"
    "golang.org/x/image/font/gofont/gomono"
    "golang.org/x/image/font/gofont/goregular"
)

// Card is everything printed on one card.
type Card struct {
    EventName     string
    StartDate     string // YYYY-MM-DD
    EndDate       string
    Venue         string
    Organizer     string
    ApplicantName string
    ApplicantID   string
    Email         string
    // QR is the signed text encoded in the QR code (see qrsign).
    QR string
    // Branding: show the event logo and drop the "Powered by" line.
    Branding bool
    LogoURL  string
    // SubEvents the applicant is enrolled in, listed under the QR code.
    SubEvents []SubEvent
    // Photo (square JPEG) and Signature (PNG/JPEG) image bytes, if any.
    Photo     []byte
    Signature []byte
}

type SubEvent struct {
    Name      string
    StartDate string // YYYY-MM-DD, empty when it has no days yet
    EndDate   string
}

// maxSubEventLines: sub-events listed before "+N more".
const maxSubEventLines = 3

// Photo and signature boxes on the card, in mm.
const (
    photoMM    = 24.0
    signatureW = 34.0
    signatureH = 10.0
)

const (
    pageW   = 105.0 // A6 portrait, mm
    pageH   = 148.0
    margin  = 8.0
    bandH   = 30.0
    qrSize  = 58.0
    logoMax = 18.0

    maxLogoBytes = 2 << 20
)

var httpClient = &http.Client{Timeout: 5 * time.Second}

// Render returns the card as PDF bytes. A logo that cannot be fetched or
// decoded is left out rather than failing the card.
func Render(ctx context.Context, c Card) ([]byte, error) {
    pdf := fpdf.NewCustom(&fpdf.InitType{UnitStr: "mm", Size: fpdf.SizeType{Wd: pageW, Ht: pageH}})
    pdf.SetMargins(margin, margin, margin)
    pdf.SetAutoPageBreak(false, 0)
    pdf.SetTitle(fmt.Sprintf("%s - %s", c.EventName, c.ApplicantName), true)
    pdf.AddUTF8FontFromBytes("go", "", goregular.TTF)
    pdf.AddUTF8FontFromBytes("go", "B", gobold.TTF)
    pdf.AddUTF8FontFromBytes("gomono", "", gomono.TTF)
    pdf.AddPage()

    // Header band with the event name (and logo when branded).
    pdf.SetFillColor(24, 24, 27)
    pdf.Rect(0, 0, pageW, bandH, "F")
    textX := margin
    if c.Branding && c.LogoURL != "" {
        if placeLogo(ctx, pdf, c.LogoURL, margin, (bandH-logoMax)/2) {
            textX = margin + logoMax + 4
        }
    }
    pdf.SetTextColor(255, 255, 255)
    pdf.SetFont("go", "B", 13)
    pdf.SetXY(textX, 7)
    pdf.MultiCell(pageW-textX-margin, 6, fit(pdf, c.EventName, pageW-textX-margin, 2), "", "L", false)
    pdf.SetFont("go", "", 8)
    pdf.SetX(textX)
    pdf.CellFormat(pageW-textX-margin, 5, dateRange(c.StartDate, c.EndDate), "", 1, "L", false, 0, "")

    // Applicant: with a photo, photo on the left and text on the right;
    // otherwise centred text. The signature goes under the applicant id.
    qrY := bandH + 26
    hasPhoto := placeImage(pdf, "photo", c.Photo, margin, bandH+5, photoMM, photoMM)
    if hasPhoto {
        textX := margin + photoMM + 4
        textW := pageW - textX - margin
        pdf.SetTextColor(24, 24, 27)
        pdf.SetFont("go", "B", 14)
        pdf.SetXY(textX, bandH+6)
        pdf.MultiCell(textW, 6, fit(pdf, c.ApplicantName, textW, 2), "", "L", false)
        pdf.SetFont("gomono", "", 8.5)
        pdf.SetTextColor(82, 82, 91)
        pdf.SetX(textX)
        pdf.CellFormat(textW, 5, c.ApplicantID, "", 1, "L", false, 0, "")
        placeImage(pdf, "signature", c.Signature, textX, pdf.GetY()+1, signatureW, signatureH)
        qrY = bandH + 5 + photoMM + 4
    } else {
        pdf.SetTextColor(24, 24, 27)
        pdf.SetFont("go", "B", 16)
        pdf.SetXY(margin, bandH+7)
        pdf.CellFormat(pageW-2*margin, 8, fit(pdf, c.ApplicantName, pageW-2*margin, 1), "", 1, "C", false, 0, "")
        pdf.SetFont("gomono", "", 9)
        pdf.SetTextColor(82, 82, 91)
        pdf.CellFormat(pageW-2*margin, 5, c.ApplicantID, "", 1, "C", false, 0, "")
        if placeImage(pdf, "signature", c.Signature, (pageW-signatureW)/2, pdf.GetY()+1, signatureW, signatureH) {
            qrY += signatureH + 2
        }
    }

    // QR code.
    png, err := qrcode.Encode(c.QR, qrcode.Medium, 512)
    if err != nil {
        return nil, fmt.Errorf("idcard: qr: %w", err)
    }
    pdf.RegisterImageOptionsReader("qr", fpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(png))
    size := qrSizeFor(c, qrY)
    pdf.ImageOptions("qr", (pageW-size)/2, qrY, size, size, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")

    // Event details.
    pdf.SetXY(margin, qrY+size+3)
    pdf.SetFont("go", "", 8)
    pdf.SetTextColor(82, 82, 91)
    for _, line := range []string{c.Venue, organizerLine(c.Organizer)} {
        if line != "" {
            pdf.CellFormat(pageW-2*margin, 4.5, fit(pdf, line, pageW-2*margin, 1), "", 1, "C", false, 0, "")
        }
    }

    // Sub-events.
    if len(c.SubEvents) > 0 {
        pdf.Ln(1)
        pdf.SetFont("go", "B", 7.5)
        pdf.SetTextColor(24, 24, 27)
        pdf.CellFormat(pageW-2*margin, 4, "Also registered for", "", 1, "C", false, 0, "")
        pdf.SetFont("go", "", 7.5)
        pdf.SetTextColor(82, 82, 91)
        for i, se := range c.SubEvents {
            if i == maxSubEventLines {
                pdf.CellFormat(pageW-2*margin, 3.8, fmt.Sprintf("+%d more", len(c.SubEvents)-maxSubEventLines), "", 1, "C", false, 0, "")
                break
            }
            line := se.Name
            if se.StartDate != "" {
                line += " · " + dateRange(se.StartDate, se.EndDate)
            }
            pdf.CellFormat(pageW-2*margin, 3.8, fit(pdf, line, pageW-2*margin, 1), "", 1, "C", false, 0, "")
        }
    }

    // Footer.
    pdf.SetY(pageH - margin - 8)
    pdf.SetFont("go", "B", 8)
    pdf.SetTextColor(24, 24, 27)
    pdf.CellFormat(pageW-2*margin, 4, "Show this QR code at the entrance", "", 1, "C", false, 0, "")
    if !c.Branding {
        pdf.SetFont("go", "", 7)
        pdf.SetTextColor(161, 161, 170)
        pdf.CellFormat(pageW-2*margin, 4, "Powered by IdentityCard", "", 1, "C", false, 0, "")
    }

    var out bytes.Buffer
    if err := pdf.Output(&out); err != nil {
        return nil, fmt.Errorf("idcard: pdf: %w", err)
    }
    return out.Bytes(), nil
}

// Filename is the attachment name for a card.
func Filename(c Card) string {
    return fmt.Sprintf("id-card-%s.pdf", c.ApplicantID)
}

// placeLogo downloads a PNG/JPEG/GIF logo and draws it in a logoMax square.
func placeLogo(ctx context.Context, pdf *fpdf.Fpdf, url string, x, y float64) bool {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return false
    }
    resp, err := httpClient.Do(req)
    if err != nil {
        return false
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return false
    }
    data, err := io.ReadAll(io.LimitReader(resp.Body, maxLogoBytes+1))
    if err != nil || len(data) > maxLogoBytes {
        return false
    }

    var imageType string
    switch http.DetectContentType(data) {
    case "image/png":
        imageType = "PNG"
    case "image/jpeg":
        imageType = "JPG"
    case "image/gif":
        imageType = "GIF"
    default:
        return false
    }

    opts := fpdf.ImageOptions{ImageType: imageType}
    info := pdf.RegisterImageOptionsReader("logo", opts, bytes.NewReader(data))
    if pdf.Ok() == false || info == nil {
        pdf.ClearError()
        return false
    }
    w, h := info.Width(), info.Height()
    if w <= 0 || h <= 0 {
        return false
    }
    scale := logoMax / max(w, h)
    pdf.ImageOptions("logo", x+(logoMax-w*scale)/2, y+(logoMax-h*scale)/2, w*scale, h*scale, false, opts, 0, "")
    return true
}

// fit shortens text with an ellipsis so it fits in `lines` lines of width w.
func fit(pdf *fpdf.Fpdf, text string, w float64, lines int) string {
    text = strings.TrimSpace(text)
    limit := w * float64(lines) * 0.95
    if pdf.GetStringWidth(text) <= limit {
        return text
    }
    runes := []rune(text)
    for len(runes) > 1 && pdf.GetStringWidth(string(runes)+"…") > limit {
        runes = runes[:len(runes)-1]
    }
    return string(runes) + "…"
}

func dateRange(start, end string) string {
    s, errS := time.Parse(time.DateOnly, start)
    e, errE := time.Parse(time.DateOnly, end)
    if errS != nil || errE != nil {
        return strings.TrimSpace(start + " - " + end)
    }
    if s.Equal(e) {
        return s.Format("2 Jan 2006")
    }
    return s.Format("2 Jan 2006") + " - " + e.Format("2 Jan 2006")
}

func organizerLine(organizer string) string {
    if organizer == "" {
        return ""
    }
    return "Organized by " + organizer
}

// qrSizeFor shrinks the QR code so everything below it (event details,
// sub-events) still fits above the footer.
func qrSizeFor(c Card, qrY float64) float64 {
    subBlock := 0.0
    if len(c.SubEvents) > 0 {
        lines := min(len(c.SubEvents), maxSubEventLines)
        if len(c.SubEvents) > maxSubEventLines {
            lines++
        }
        subBlock = 5 + 3.8*float64(lines)
    }
    const footerTop = pageH - margin - 8
    const detailLines = 2 * 4.5
    free := footerTop - qrY - 3 - detailLines - subBlock
    return min(qrSize, free)
}

// placeImage draws JPEG/PNG bytes fitted into a w×h box (aspect kept, top
// left aligned) and reports whether it drew anything.
func placeImage(pdf *fpdf.Fpdf, name string, data []byte, x, y, w, h float64) bool {
    if len(data) == 0 {
        return false
    }
    var imageType string
    switch http.DetectContentType(data) {
    case "image/png":
        imageType = "PNG"
    case "image/jpeg":
        imageType = "JPG"
    default:
        return false
    }
    opts := fpdf.ImageOptions{ImageType: imageType}
    info := pdf.RegisterImageOptionsReader(name, opts, bytes.NewReader(data))
    if !pdf.Ok() || info == nil || info.Width() <= 0 || info.Height() <= 0 {
        pdf.ClearError()
        return false
    }
    scale := min(w/info.Width(), h/info.Height())
    pdf.ImageOptions(name, x, y, info.Width()*scale, info.Height()*scale, false, opts, 0, "")
    return true
}
