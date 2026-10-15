package cards

import (
    "bytes"
    "fmt"
    "html/template"
)

func errorf(base error, msg string) error {
    return fmt.Errorf("%w: %s", base, msg)
}

var cardEmail = template.Must(template.New("card").Parse(`<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td>
{{if .Logo}}<img src="{{.Logo}}" alt="" style="max-height:48px;margin-bottom:16px">{{end}}
<h1 style="font-size:20px;margin:0 0 12px">Your ID card for {{.EventName}}</h1>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px">Hi {{.Name}},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px">Your ID card is attached as a PDF. Show its QR code at the entrance{{if .Venue}} at {{.Venue}}{{end}}. You can show it on your phone or print it.</p>
<p style="font-size:13px;line-height:1.6;margin:0;color:#52525b">Applicant ID: <span style="font-family:monospace">{{.ApplicantID}}</span></p>
{{if not .Branding}}<p style="font-size:11px;color:#a1a1aa;margin:24px 0 0">Powered by IdentityCard</p>{{end}}
</td></tr></table>
</td></tr></table>
</body></html>`))

func renderCardEmail(d *cardData) (string, string, error) {
    data := struct {
        *cardData
        Logo string
    }{cardData: d}
    if d.Branding {
        data.Logo = d.Logo
    }
    var html bytes.Buffer
    if err := cardEmail.Execute(&html, data); err != nil {
        return "", "", err
    }
    text := fmt.Sprintf("Hi %s,\n\nYour ID card for %s is attached as a PDF. Show its QR code at the entrance.\n\nApplicant ID: %s\n",
        d.Name, d.EventName, d.ApplicantID)
    return html.String(), text, nil
}
