package utils

import (
    "regexp"
    "testing"
)

func TestGenerateApplicantUserID_Format(t *testing.T) {
    eventID := "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    userID := GenerateApplicantUserID(eventID)

    // Expected format: {8 hex}-{8 hex}-{8 date YYYYMMDD} -> 26 chars total
    expectedPattern := regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{8}-\d{8}$`)
    if !expectedPattern.MatchString(userID) {
        t.Fatalf("generated user ID %s does not match expected pattern {8}-{8}-{8}", userID)
    }

    // Verify first 8 chars match event ID without dashes
    if userID[:8] != "a0eebc99" {
        t.Fatalf("expected prefix to be a0eebc99, got %s", userID[:8])
    }
}

func TestGenerateApplicantUserID_Uniqueness(t *testing.T) {
    eventID := "b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22"
    const count = 1000
    seen := make(map[string]bool, count)

    for i := 0; i < count; i++ {
        id := GenerateApplicantUserID(eventID)
        if seen[id] {
            t.Fatalf("collision detected at iteration %d: %s", i, id)
        }
        seen[id] = true
    }
}
