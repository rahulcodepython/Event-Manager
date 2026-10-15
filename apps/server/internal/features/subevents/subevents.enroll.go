package subevents

import (
    "context"
    "errors"
    "fmt"
    "sort"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrSubEventNotFound  = errors.New("sub-event not found")
    ErrNotRegistered     = errors.New("applicant is not registered for this event")
    ErrSubEventFull      = errors.New("sub-event is full")
    ErrOnlyOne           = errors.New("only one sub-event can be chosen")
    ErrSelectionRequired = errors.New("choose at least one sub-event")
    ErrNotSelectable     = errors.New("sub-events cannot be chosen on this form")
)

// LockKey is the advisory lock every enrollment into a sub-event takes, so
// its cap holds exactly.
func LockKey(subEventID string) string {
    return "sub_event_applicants:" + subEventID
}

// EnrollTx enrolls an applicant in sub-events inside tx. With rules (public
// form) the form's choice rules apply; without (organizer) only the caps
// do. Being already enrolled is not an error.
func EnrollTx(ctx context.Context, tx pgx.Tx, eventID, applicantID string, subEventIDs []string, rules *SelfRules) error {
    ids := dedupe(subEventIDs)

    if rules != nil {
        if !rules.Fixed {
            switch {
            case rules.Mode == "off" && len(ids) > 0:
                return ErrNotSelectable
            case rules.Required && len(ids) == 0:
                return ErrSelectionRequired
            }
        }
        if rules.Mode == "one" {
            var others int
            if err := tx.QueryRow(ctx, OtherEnrollmentsQuery, eventID, applicantID, ids).Scan(&others); err != nil {
                return postgres.MapPgError(err)
            }
            if others+len(ids) > 1 {
                return ErrOnlyOne
            }
        }
    }

    // Sorted locks: two transactions never wait on each other in a cycle.
    sort.Strings(ids)
    for _, id := range ids {
        if err := postgres.LockKey(ctx, tx, LockKey(id)); err != nil {
            return err
        }
        var code, name string
        if err := tx.QueryRow(ctx, EnrollQuery, id, eventID, applicantID).Scan(&code, &name); err != nil {
            return postgres.MapPgError(err)
        }
        switch code {
        case "ok", "already":
        case "not_found":
            return ErrSubEventNotFound
        case "not_registered":
            return ErrNotRegistered
        case "full":
            return fmt.Errorf("%w: %s", ErrSubEventFull, name)
        default:
            return fmt.Errorf("enroll: unexpected status %q", code)
        }
    }
    return nil
}

func dedupe(ids []string) []string {
    seen := make(map[string]bool, len(ids))
    out := make([]string, 0, len(ids))
    for _, id := range ids {
        if id != "" && !seen[id] {
            seen[id] = true
            out = append(out, id)
        }
    }
    return out
}
