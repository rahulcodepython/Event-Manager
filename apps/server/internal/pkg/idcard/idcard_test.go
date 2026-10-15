package idcard

import (
    "bytes"
    "context"
    "testing"
)

func TestRender(t *testing.T) {
    out, err := Render(context.Background(), Card{
        EventName:     "Silicon Valley AI & Cloud Expo 2026 with a very long name that wraps",
        StartDate:     "2026-10-15",
        EndDate:       "2026-10-17",
        Venue:         "Moscone Center",
        Organizer:     "Demo Org",
        ApplicantName: "Ravi Kumar Śarma",
        ApplicantID:   "4afe1ad4-1a2b3c4d-20261015",
        QR:            "IC1.payload.sig",
    })
    if err != nil {
        t.Fatal(err)
    }
    if !bytes.HasPrefix(out, []byte("%PDF")) {
        t.Fatalf("not a pdf")
    }
}
