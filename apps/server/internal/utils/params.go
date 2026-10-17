package utils

import (
    "fmt"
    "strconv"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/generic"
)

// PaginationParams extracts sanitized page and limit integers from query parameters.
func PaginationParams(c *fiber.Ctx) (int, int) {
    page, err := strconv.Atoi(c.Query("page", strconv.Itoa(generic.DefaultPage)))
    if err != nil || page < generic.DefaultPage {
        page = generic.DefaultPage
    }

    limit, err := strconv.Atoi(c.Query("limit", strconv.Itoa(generic.DefaultLimit)))
    if err != nil || limit < 1 {
        limit = generic.DefaultLimit
    }
    if limit > generic.MaxLimit {
        limit = generic.MaxLimit
    }

    return page, limit
}

// RequireQuery reads a required query string parameter, returning an error if missing or empty.
func RequireQuery(c *fiber.Ctx, key, label string) (string, error) {
    val := c.Query(key)
    if val == "" {
        return "", ErrBadRequest(c, fmt.Sprintf("%s query param required", label), nil)
    }
    return val, nil
}
