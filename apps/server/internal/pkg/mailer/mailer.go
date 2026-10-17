// Package mailer sends email through the Resend HTTP API.
package mailer

import (
    "bytes"
    "context"
    "encoding/base64"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "time"
)

var ErrNotConfigured = errors.New("email is not configured (RESEND_API_KEY)")

type Attachment struct {
    Filename string
    Content  []byte
}

type Message struct {
    To          string
    Subject     string
    HTML        string
    Text        string
    Attachments []Attachment
}

type Mailer struct {
    apiKey  string
    from    string
    baseURL string // RESEND_BASE_URL, e.g. https://api.resend.com
    http    *http.Client
}

func New(apiKey, from, baseURL string) *Mailer {
    return &Mailer{apiKey: apiKey, from: from, baseURL: baseURL, http: &http.Client{Timeout: 30 * time.Second}}
}

type resendAttachment struct {
    Filename string `json:"filename"`
    Content  string `json:"content"`
}

type resendEmail struct {
    From        string             `json:"from"`
    To          []string           `json:"to"`
    Subject     string             `json:"subject"`
    HTML        string             `json:"html,omitempty"`
    Text        string             `json:"text,omitempty"`
    Attachments []resendAttachment `json:"attachments,omitempty"`
}

// Send delivers one message. A 4xx other than 429 is permanent: retrying
// will not help (bad address, invalid sender).
func (m *Mailer) Send(ctx context.Context, msg Message) error {
    if m.apiKey == "" {
        return ErrNotConfigured
    }

    body := resendEmail{From: m.from, To: []string{msg.To}, Subject: msg.Subject, HTML: msg.HTML, Text: msg.Text}
    for _, a := range msg.Attachments {
        body.Attachments = append(body.Attachments, resendAttachment{
            Filename: a.Filename,
            Content:  base64.StdEncoding.EncodeToString(a.Content),
        })
    }
    raw, err := json.Marshal(body)
    if err != nil {
        return err
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.baseURL+"/emails", bytes.NewReader(raw))
    if err != nil {
        return err
    }
    req.Header.Set("Authorization", "Bearer "+m.apiKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := m.http.Do(req)
    if err != nil {
        return fmt.Errorf("resend: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode < 300 {
        return nil
    }

    detail, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
    err = fmt.Errorf("resend: status %d: %s", resp.StatusCode, bytes.TrimSpace(detail))
    if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != http.StatusTooManyRequests {
        return &PermanentError{Err: err}
    }
    return err
}

// PermanentError marks a failure that a retry cannot fix.
type PermanentError struct {
    Err error
}

func (e *PermanentError) Error() string { return e.Err.Error() }
func (e *PermanentError) Unwrap() error { return e.Err }
