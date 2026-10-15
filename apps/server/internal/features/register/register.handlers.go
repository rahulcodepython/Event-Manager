package register

import (
    "errors"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/subevents"
    "identitycard-server/internal/utils"
)

func (h *App) GetPublicApplyConfigHandler(c *fiber.Ctx) error {
    eventFormID := c.Params("eventFormId")

    res, err := h.GetPublicApplyConfigService(c.UserContext(), eventFormID)
    if err != nil {
        if errors.Is(err, ErrInvalidEventFormID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get public form details", err)
    }

    return utils.OK(c, "public form details retrieved successfully", res)
}

func (h *App) SubmitApplicationHandler(c *fiber.Ctx) error {
    eventFormID := c.Params("eventFormId")

    req, err := utils.ParseBody[SubmitApplicationRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    res, err := h.SubmitApplicationService(c.UserContext(), eventFormID, *req)
    if err != nil {
        if errors.Is(err, ErrInvalidEventFormID) || errors.Is(err, ErrDataPayloadTooLarge) || errors.Is(err, applicants.ErrInvalidName) || errors.Is(err, applicants.ErrInvalidEmail) || errors.Is(err, applicants.ErrInvalidPhone) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotLive) || errors.Is(err, ErrFormExpired) || errors.Is(err, ErrFormLimitReached) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, applicants.ErrAlreadyRegistered) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        if errors.Is(err, ErrSubEventLinkClosed) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if subevents.IsEnrollError(err) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to submit application", err)
    }

    return utils.Created(c, "application submitted successfully", res)
}
