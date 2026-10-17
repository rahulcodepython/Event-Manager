package utils

import (
    "context"
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/generic"
)

// ErrorHandler is Fiber's global error handler. It intercepts all returned
// errors and sends the canonical error response using the Respond function.
func ErrorHandler(c *fiber.Ctx, err error) error {
    if errors.Is(err, context.Canceled) {
        return Respond(c, 499, false, generic.ErrMsgRequestCanceled, any(nil), err)
    }
    if errors.Is(err, context.DeadlineExceeded) {
        return Respond(c, fiber.StatusGatewayTimeout, false, generic.ErrMsgRequestTimeout, any(nil), err)
    }

    code := fiber.StatusInternalServerError
    message := generic.ErrMsgInternal

    var fe *fiber.Error
    if errors.As(err, &fe) {
        code = fe.Code
        message = fe.Message
    } else if errors.Is(err, fiber.ErrNotFound) {
        code = fiber.StatusNotFound
        message = generic.ErrMsgNotFound
    }

    return Respond(c, code, false, message, any(nil), err)
}
