package middlewares

import (
    "errors"
    "fmt"
    "strings"

    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

const (
    localsUserID = "auth_user_id"
    localsOrgID  = "auth_org_id"
)

// SetIdentity stores the authenticated user and organization on the request.
func SetIdentity(c *fiber.Ctx, userID, orgID string) {
    c.Locals(localsUserID, userID)
    c.Locals(localsOrgID, orgID)
}

// UserID returns the authenticated user's id ("" when unauthenticated).
func UserID(c *fiber.Ctx) string {
    v, _ := c.Locals(localsUserID).(string)
    return v
}

// OrgID returns the authenticated user's organization id ("" before onboarding).
func OrgID(c *fiber.Ctx) string {
    v, _ := c.Locals(localsOrgID).(string)
    return v
}

// RequireOrganization rejects users who haven't finished onboarding.
func RequireOrganization(c *fiber.Ctx) error {
    if OrgID(c) == "" {
        return utils.ErrForbidden(c, "complete onboarding first", nil)
    }
    return c.Next()
}

// OwnedBy returns a middleware that 404s unless the row whose id is in route
// param `param` belongs to the caller's organization. `table` must be a
// trusted constant, never user input.
func OwnedBy(db *pgxpool.Pool, table, param string) fiber.Handler {
    query := fmt.Sprintf("SELECT EXISTS (SELECT 1 FROM %s WHERE id::text = $1 AND organization_id = $2)", table)

    return func(c *fiber.Ctx) error {
        var owned bool
        if err := db.QueryRow(c.UserContext(), query, c.Params(param), OrgID(c)).Scan(&owned); err != nil {
            return utils.ErrInternal(c, "failed to verify ownership", err)
        }
        if !owned {
            return utils.ErrNotFound(c, "resource not found", nil)
        }
        return c.Next()
    }
}

// EventWritable blocks writes under /events/:eventId once the event's
// credit has ended or its organization is suspended. Reads stay allowed,
// and so does deleting the event.
func EventWritable(db *pgxpool.Pool) fiber.Handler {
    return func(c *fiber.Ctx) error {
        if c.Method() == fiber.MethodGet || c.Method() == fiber.MethodHead {
            return c.Next()
        }
        eventID := c.Params("eventId")
        if c.Method() == fiber.MethodDelete && strings.TrimSuffix(c.Path(), "/") == generic.APIV1Prefix+"/events/"+eventID {
            return c.Next()
        }
        if err := entitlements.RequireWritable(c.UserContext(), db, eventID); err != nil {
            if errors.Is(err, entitlements.ErrReadOnly) || errors.Is(err, entitlements.ErrSuspended) {
                return utils.ErrForbidden(c, err.Error(), err)
            }
            if errors.Is(err, postgres.ErrNotFound) {
                return utils.ErrNotFound(c, "event not found", err)
            }
            return utils.ErrInternal(c, "failed to check event status", err)
        }
        return c.Next()
    }
}

// UUIDParam 404s unless route param `param` is a valid UUID, so queries can
// cast it without failing on malformed input.
func UUIDParam(param string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        if err := uuid.Validate(c.Params(param)); err != nil {
            return utils.ErrNotFound(c, "resource not found", nil)
        }
        return c.Next()
    }
}
