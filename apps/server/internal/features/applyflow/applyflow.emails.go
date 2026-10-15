package applyflow

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

// Email jobs (id = draft id).
const (
    JobConfirmed = "application_confirmed"
    JobRefunded  = "application_refunded"
)

type emailData struct {
    Email        string `json:"email"`
    Name         string `json:"name"`
    EventName    string `json:"event_name"`
    ApplicantID  string `json:"applicant_id"`
    Amount       int64  `json:"amount"`
    RefundReason string `json:"refund_reason"`
}

const emailDataQuery = `
    SELECT jsonb_build_object(
        'email', d.email, 'name', d.name, 'event_name', COALESCE(em.name, ''),
        'applicant_id', COALESCE(d.applicant_id, ''), 'amount', d.amount, 'refund_reason', d.refund_reason
    )
    FROM application_drafts d LEFT JOIN event_metadata em ON em.id = d.event_id
    WHERE d.id = $1::uuid;
`

var emailTemplate = template.Must(template.New("application").Parse(`<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td>
<h1 style="font-size:20px;margin:0 0 12px">{{.Title}}</h1>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px">Hi {{.Name}},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px">{{.Body}}</p>
{{if .ApplicantID}}<p style="font-size:13px;color:#52525b;margin:0">Applicant ID: <span style="font-family:monospace">{{.ApplicantID}}</span></p>{{end}}
</td></tr></table>
</td></tr></table>
</body></html>`))

func rupees(paise int64) string {
    if paise%100 == 0 {
        return fmt.Sprintf("₹%d", paise/100)
    }
    return fmt.Sprintf("₹%d.%02d", paise/100, paise%100)
}

func (s *App) ConfirmedJobHandler() jobqueue.Handler { return jobqueue.Handler{Run: s.sendEmail(JobConfirmed)} }
func (s *App) RefundedJobHandler() jobqueue.Handler  { return jobqueue.Handler{Run: s.sendEmail(JobRefunded)} }

func (s *App) sendEmail(kind string) func(ctx context.Context, job jobqueue.Job) error {
    return func(ctx context.Context, job jobqueue.Job) error {
        d, err := postgres.QueryJSON[emailData](ctx, s.DB, emailDataQuery, job.ID)
        if errors.Is(err, postgres.ErrNotFound) {
            return nil
        }
        if err != nil {
            return err
        }
        var title, body string
        switch kind {
        case JobConfirmed:
            title = "You're registered for " + d.EventName
            body = "Your registration is confirmed."
            if d.Amount > 0 {
                body = fmt.Sprintf("We received your application fee of %s and your registration is confirmed.", rupees(d.Amount))
            }
            body += " Your ID card will be emailed to you before the event."
        case JobRefunded:
            title = "Your registration for " + d.EventName + " was refunded"
            body = fmt.Sprintf("Your application fee of %s has been refunded to your original payment method and you are no longer registered.", rupees(d.Amount))
            if d.RefundReason != "" {
                body += " Reason: " + d.RefundReason + "."
            }
        }
        var html bytes.Buffer
        if err := emailTemplate.Execute(&html, map[string]string{"Title": title, "Name": d.Name, "Body": body, "ApplicantID": d.ApplicantID}); err != nil {
            return jobqueue.Permanent(err)
        }
        err = s.Mailer.Send(ctx, mailer.Message{To: d.Email, Subject: title, HTML: html.String(), Text: fmt.Sprintf("Hi %s,\n\n%s\n", d.Name, body)})
        var permanent *mailer.PermanentError
        if errors.Is(err, mailer.ErrNotConfigured) || errors.As(err, &permanent) {
            return jobqueue.Permanent(err)
        }
        return err
    }
}
