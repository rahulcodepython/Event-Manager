package credits

import (
    "bytes"
    "context"
    "errors"
    "fmt"
    "html/template"

    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/postgres"
)

// ReceiptJobType emails the receipt of a free purchase (id = payment id).
// Paid purchases get Razorpay's own receipt.
const ReceiptJobType = "receipt"

var receiptEmail = template.Must(template.New("receipt").Funcs(template.FuncMap{"money": formatMoney}).Parse(`<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td>
<h1 style="font-size:20px;margin:0 0 4px">Purchase confirmed</h1>
<p style="font-size:13px;color:#52525b;margin:0 0 20px">Receipt {{.Number}} · {{.Date}}</p>
<p style="font-size:14px;margin:0 0 16px">Hi {{.Name}}, your credit <strong>{{.CreditName}}</strong> is ready.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr><td style="padding:4px 0;color:#52525b">Base fee</td><td align="right">{{money .Quote.BaseFee .Currency}}</td></tr>
{{range .Quote.Lines}}{{if .Amount}}<tr><td style="padding:4px 0;color:#52525b">{{.Name}} ({{.Label}})</td><td align="right">{{money .Amount $.Currency}}</td></tr>{{end}}{{end}}
<tr><td style="padding:4px 0;color:#52525b;border-top:1px solid #e4e4e7">Subtotal</td><td align="right" style="border-top:1px solid #e4e4e7">{{money .Quote.Subtotal .Currency}}</td></tr>
<tr><td style="padding:4px 0;color:#52525b">Coupon {{.CouponCode}}</td><td align="right">-{{money .Discount .Currency}}</td></tr>
<tr><td style="padding:4px 0;color:#52525b">{{.Quote.TaxName}}</td><td align="right">{{money .Quote.Tax .Currency}}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #e4e4e7">Total paid</td><td align="right" style="font-weight:bold;border-top:1px solid #e4e4e7">{{money .Amount .Currency}}</td></tr>
</table>
<p style="font-size:12px;color:#a1a1aa;margin:20px 0 0">{{.Organization}}</p>
</td></tr></table>
</td></tr></table>
</body></html>`))

// ReceiptJobHandler emails one free purchase's receipt.
func (s *App) ReceiptJobHandler() jobqueue.Handler {
    return jobqueue.Handler{Run: s.sendReceipt}
}

func (s *App) sendReceipt(ctx context.Context, job jobqueue.Job) error {
    r, err := s.ReceiptRepository(ctx, job.ID)
    if errors.Is(err, postgres.ErrNotFound) {
        return nil
    }
    if err != nil {
        return err
    }

    name := r.OwnerName
    if name == "" {
        name = r.Organization
    }
    number := r.PaymentID
    if len(number) > 8 {
        number = number[:8]
    }
    var html bytes.Buffer
    err = receiptEmail.Execute(&html, map[string]any{
        "Number": number, "Date": r.PaidAt.Format("2 Jan 2006"), "Name": name, "CreditName": r.CreditName,
        "Quote": r.Quote, "Currency": r.Currency, "CouponCode": r.CouponCode, "Discount": r.Discount,
        "Amount": r.Amount, "Organization": r.Organization,
    })
    if err != nil {
        return jobqueue.Permanent(err)
    }

    err = s.Mailer.Send(ctx, mailer.Message{
        To:      r.Email,
        Subject: fmt.Sprintf("Receipt: %s", r.CreditName),
        HTML:    html.String(),
        Text:    fmt.Sprintf("Purchase confirmed: %s. Coupon %s, total paid %s.\n", r.CreditName, r.CouponCode, formatMoney(r.Amount, r.Currency)),
    })
    var permanent *mailer.PermanentError
    if errors.Is(err, mailer.ErrNotConfigured) || errors.As(err, &permanent) {
        return jobqueue.Permanent(err)
    }
    return err
}

func formatMoney(paise int64, currency string) string {
    symbol := currency + " "
    if currency == "INR" {
        symbol = "₹"
    }
    if paise%100 == 0 {
        return fmt.Sprintf("%s%d", symbol, paise/100)
    }
    return fmt.Sprintf("%s%d.%02d", symbol, paise/100, paise%100)
}
