package applyflow

import (
    "errors"
    "log/slog"
    "net/url"
    "strings"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/features/subevents"
    "identitycard-server/internal/features/uploads"
    "identitycard-server/internal/pkg/applicantsession"
    "identitycard-server/internal/pkg/googleid"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/razorpay"
    "identitycard-server/internal/utils"
)

func (h *App) IntentHandler(c *fiber.Ctx) error {
    res, err := h.IntentService(c.UserContext(), func(formID string) (string, error) {
        return h.Sessions.NewIntent(c, formID)
    }, c.Params("eventFormId"))
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "sign-in started", res)
}

// SignInHandler: popup mode, the page posts Google's credential.
func (h *App) SignInHandler(c *fiber.Ctx) error {
    var req SignInRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    formID := c.Params("eventFormId")
    intentForm, nonce, _ := h.Sessions.Intent(c)
    sess, err := h.SignInService(c.UserContext(), intentForm, nonce, formID, req.Credential)
    if err != nil {
        return flowError(c, err)
    }
    if err := h.Sessions.Set(c, *sess); err != nil {
        return utils.ErrInternal(c, "failed to sign in", err)
    }
    state, err := h.StateService(c.UserContext(), sess)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "signed in", state)
}

// GoogleCallbackHandler: redirect mode (popups blocked), Google posts the
// credential here (APPLICANT_GOOGLE_LOGIN_URI); the form comes from the
// intent cookie. Always ends on the form page.
func (h *App) GoogleCallbackHandler(c *fiber.Ctx) error {
    intentForm, nonce, _ := h.Sessions.Intent(c)
    target := strings.TrimRight(h.Cfg.WebURL, "/") + "/apply/" + url.PathEscape(intentForm)
    sess, err := h.SignInService(c.UserContext(), intentForm, nonce, intentForm, c.FormValue("credential"))
    if err == nil {
        err = h.Sessions.Set(c, *sess)
    }
    if err != nil {
        slog.Warn("applyflow: google callback", "error", err)
        if intentForm == "" {
            return c.Redirect(strings.TrimRight(h.Cfg.WebURL, "/"), fiber.StatusSeeOther)
        }
        return c.Redirect(target+"?signin_error="+url.QueryEscape(err.Error()), fiber.StatusSeeOther)
    }
    return c.Redirect(target, fiber.StatusSeeOther)
}

func (h *App) session(c *fiber.Ctx) (*applicantsession.Session, error) {
    return h.Sessions.Get(c, c.Params("eventFormId"))
}

func (h *App) StateHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return utils.OK(c, "not signed in", State{SignedIn: false})
    }
    state, err := h.StateService(c.UserContext(), sess)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "application state", state)
}

func (h *App) SaveHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    var req SaveRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    state, err := h.SaveService(c.UserContext(), sess, req)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "draft saved", state)
}

func (h *App) SubmitHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    state, err := h.SubmitService(c.UserContext(), sess)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "application confirmed", state)
}

func (h *App) EnrollHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    var req EnrollRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    state, err := h.EnrollService(c.UserContext(), sess, req)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "enrolled", state)
}

func (h *App) SignOutHandler(c *fiber.Ctx) error {
    h.Sessions.Clear(c)
    return utils.OKEmpty(c, "signed out")
}

func flowError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, applicantsession.ErrNoSession):
        return utils.ErrUnauthorized(c, err.Error(), err)
    case errors.Is(err, googleid.ErrInvalid), errors.Is(err, ErrBadNonce):
        return utils.ErrUnauthorized(c, err.Error(), err)
    case errors.Is(err, ErrFormNotFound), errors.Is(err, register.ErrFormNotFound):
        return utils.ErrNotFound(c, err.Error(), err)
    case errors.Is(err, ErrDraftLocked), errors.Is(err, ErrRegistered), errors.Is(err, ErrRefunded),
        errors.Is(err, applicants.ErrAlreadyRegistered):
        return utils.ErrConflict(c, err.Error(), err)
    case errors.Is(err, ErrBadSignature), errors.Is(err, ErrNoFee):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrPaymentsUnavailable), errors.Is(err, razorpay.ErrNotConfigured):
        return utils.Respond(c, fiber.StatusServiceUnavailable, false, ErrPaymentsUnavailable.Error(), any(nil), err)
    case errors.Is(err, register.ErrFormNotLive), errors.Is(err, register.ErrFormExpired),
        errors.Is(err, register.ErrFormLimitReached), errors.Is(err, register.ErrSubEventLinkClosed),
        errors.Is(err, ErrNotRegistered), errors.Is(err, ErrPaymentPending):
        return utils.ErrForbidden(c, err.Error(), err)
    case errors.Is(err, ErrDraftTooLarge), errors.Is(err, register.ErrDataPayloadTooLarge),
        errors.Is(err, applicants.ErrInvalidName), errors.Is(err, applicants.ErrInvalidEmail),
        errors.Is(err, applicants.ErrInvalidPhone), errors.Is(err, register.ErrInvalidEventFormID),
        errors.Is(err, uploads.ErrImageRequired), errors.Is(err, uploads.ErrBadToken),
        subevents.IsEnrollError(err):
        return utils.ErrBadRequest(c, err.Error(), err)
    }
    return utils.ErrInternal(c, "application request failed", err)
}

func (h *App) PayHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    res, err := h.PayService(c.UserContext(), sess)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "payment started", res)
}

func (h *App) BackHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    state, err := h.BackService(c.UserContext(), sess)
    if err != nil {
        return flowError(c, err)
    }
    return utils.OK(c, "back to editing", state)
}

func (h *App) VerifyHandler(c *fiber.Ctx) error {
    sess, err := h.session(c)
    if err != nil {
        return flowError(c, err)
    }
    var req VerifyRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    state, err := h.VerifyService(c.UserContext(), sess, req)
    if err != nil {
        return flowError(c, err)
    }
    if state.Registration != nil && state.Registration.Status == "refunded" {
        return utils.OK(c, "payment refunded", state)
    }
    return utils.OK(c, "payment confirmed", state)
}

// RefundHandler (organizer): refund a paid applicant and remove them.
func (h *App) RefundHandler(c *fiber.Ctx) error {
    var req RefundRequest
    if len(c.Body()) > 0 {
        if err := c.BodyParser(&req); err != nil {
            return utils.ErrBadRequest(c, "invalid request body", err)
        }
    }
    if err := h.RefundService(c.UserContext(), c.Params("eventId"), c.Params("applicantId"), req); err != nil {
        var apiErr *razorpay.APIError
        switch {
        case errors.Is(err, ErrNotPaid):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.As(err, &apiErr):
            return utils.ErrBadRequest(c, apiErr.Error(), err)
        }
        return utils.ErrInternal(c, "refund failed", err)
    }
    return utils.OKEmpty(c, "applicant refunded and removed")
}

// DraftsHandler (organizer): applications not yet confirmed.
func (h *App) DraftsHandler(c *fiber.Ctx) error {
    list, err := postgres.QueryJSONSlice[OrganizerDraft](c.UserContext(), h.DB, organizerDraftsQuery, c.Params("eventId"))
    if err != nil {
        return utils.ErrInternal(c, "failed to list drafts", err)
    }
    return utils.OK(c, "drafts", list)
}

type FeeSettings struct {
    Fee          int64  `json:"fee"`
    Currency     string `json:"currency"`
    PayoutActive bool   `json:"payout_active"`
    HasForm      bool   `json:"has_form"`
}

type FeeRequest struct {
    Fee int64 `json:"fee"`
}

func (h *App) feeSettings(c *fiber.Ctx) (*FeeSettings, error) {
    eventID := c.Params("eventId")
    res := &FeeSettings{Currency: currency}
    err := h.DB.QueryRow(c.UserContext(), `SELECT fee FROM event_forms WHERE event_id = $1::uuid`, eventID).Scan(&res.Fee)
    if err == nil {
        res.HasForm = true
    } else if !errors.Is(postgres.MapPgError(err), postgres.ErrNotFound) {
        return nil, err
    }
    account, err := h.Payouts.ActiveAccountID(c.UserContext(), eventID)
    if err != nil {
        return nil, err
    }
    res.PayoutActive = account != ""
    return res, nil
}

func (h *App) GetFeeHandler(c *fiber.Ctx) error {
    res, err := h.feeSettings(c)
    if err != nil {
        return utils.ErrInternal(c, "failed to load fee", err)
    }
    return utils.OK(c, "application fee", res)
}

// SetFeeHandler sets the form's application fee (paise). A fee needs an
// active payout account; open orders keep their amount until retried.
func (h *App) SetFeeHandler(c *fiber.Ctx) error {
    var req FeeRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    if req.Fee < 0 || (req.Fee > 0 && req.Fee < 100) {
        return utils.ErrBadRequest(c, "the fee must be 0 (free) or at least ₹1", nil)
    }
    cur, err := h.feeSettings(c)
    if err != nil {
        return utils.ErrInternal(c, "failed to load fee", err)
    }
    if !cur.HasForm {
        return utils.ErrNotFound(c, "create the registration form first", nil)
    }
    if req.Fee > 0 && !cur.PayoutActive {
        return utils.ErrForbidden(c, "set up payouts before charging a fee", nil)
    }
    if err := postgres.Exec(c.UserContext(), h.DB, `UPDATE event_forms SET fee = $2, updated_at = now() WHERE event_id = $1::uuid`, c.Params("eventId"), req.Fee); err != nil {
        return utils.ErrInternal(c, "failed to save fee", err)
    }
    cur.Fee = req.Fee
    return utils.OK(c, "application fee saved", cur)
}

// RegisterOrgRoutes mounts the organizer's routes (org tier).
func (h *App) RegisterOrgRoutes(r fiber.Router) {
    r.Get("/events/:eventId/application-fee", h.GetFeeHandler)
    r.Put("/events/:eventId/application-fee", h.SetFeeHandler)
    r.Get("/events/:eventId/drafts", h.DraftsHandler)
    r.Post("/events/:eventId/applicants/:applicantId/refund", h.RefundHandler)
}
