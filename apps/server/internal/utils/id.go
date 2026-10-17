package utils

import (
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/generic"
)

// GenerateApplicantUserID creates a custom user_id format: (event_uuid + random(uuid) + date).
// Format: {event_uuid_first_8}-{random_uuid_first_8}-{YYYYMMDD}
func GenerateApplicantUserID(eventID string) string {
    eventClean := strings.ReplaceAll(eventID, "-", "")
    if len(eventClean) > 8 {
        eventClean = eventClean[:8]
    }

    randomClean := strings.ReplaceAll(uuid.NewString(), "-", "")
    if len(randomClean) > 8 {
        randomClean = randomClean[:8]
    }

    datePart := time.Now().UTC().Format(generic.CompactDateFormat)
    return fmt.Sprintf("%s-%s-%s", eventClean, randomClean, datePart)
}
