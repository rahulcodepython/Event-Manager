package qrsign

import (
    "strings"
    "testing"
)

func TestSignVerify(t *testing.T) {
    s := New("secret")
    token := s.Sign("event-1", "applicant-1")

    p, err := s.Verify(token)
    if err != nil || p.EventID != "event-1" || p.ApplicantID != "applicant-1" {
        t.Fatalf("verify = %+v, %v", p, err)
    }

    if _, err := New("other").Verify(token); err != ErrInvalid {
        t.Fatalf("wrong key accepted")
    }

    parts := strings.Split(token, ".")
    forged := New("x").Sign("event-1", "applicant-2")
    if _, err := s.Verify(parts[0] + "." + strings.Split(forged, ".")[1] + "." + parts[2]); err != ErrInvalid {
        t.Fatalf("edited payload accepted")
    }

    for _, bad := range []string{"", "abc", "IC1.a.b", "IC2." + parts[1] + "." + parts[2]} {
        if _, err := s.Verify(bad); err != ErrInvalid {
            t.Fatalf("accepted %q", bad)
        }
    }
}
