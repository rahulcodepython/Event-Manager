package utils

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/generic"
)

// Respond writes the canonical wire envelope response for both success and error outcomes.
func Respond[T any](c *fiber.Ctx, status int, success bool, message string, data T, err error) error {
    body := generic.Response[T]{
        Success: success,
        Message: message,
        Data:    data,
        Error:   err,
    }
    return c.Status(status).JSON(body)
}

// OK writes a 200 OK success response.
func OK[T any](c *fiber.Ctx, message string, data T) error {
    return Respond(c, fiber.StatusOK, true, message, data, nil)
}

// OKEmpty writes a 200 OK success response with no data payload.
func OKEmpty(c *fiber.Ctx, message string) error {
    return Respond(c, fiber.StatusOK, true, message, any(nil), nil)
}

// Created writes a 201 Created success response.
func Created[T any](c *fiber.Ctx, message string, data T) error {
    return Respond(c, fiber.StatusCreated, true, message, data, nil)
}

func ErrBadRequest(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusBadRequest, false, message, any(nil), err)
}

func ErrUnauthorized(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusUnauthorized, false, message, any(nil), err)
}

func ErrForbidden(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusForbidden, false, message, any(nil), err)
}

func ErrNotFound(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusNotFound, false, message, any(nil), err)
}

func ErrConflict(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusConflict, false, message, any(nil), err)
}

func ErrValidation(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusUnprocessableEntity, false, message, any(nil), err)
}

func ErrTooManyRequests(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusTooManyRequests, false, message, any(nil), err)
}

func ErrInternal(c *fiber.Ctx, message string, err error) error {
    return Respond(c, fiber.StatusInternalServerError, false, message, any(nil), err)
}
