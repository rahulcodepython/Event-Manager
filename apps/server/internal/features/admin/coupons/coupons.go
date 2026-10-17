// Package coupons is the admin's coupon management. Coupons are checked
// and applied by pricing.ApplyCoupon.
package coupons

import (
    "context"
    "errors"
    "fmt"
    "regexp"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

type App struct {
    DB *pgxpool.Pool
}

func NewApp(db *pgxpool.Pool) *App {
    return &App{DB: db}
}

type Coupon struct {
    ID               string     `json:"id"`
    Code             string     `json:"code"`
    Description      string     `json:"description"`
    Kind             string     `json:"kind"`
    PercentBP        *int       `json:"percent_bp"`
    Amount           *int64     `json:"amount"`
    MaxDiscount      *int64     `json:"max_discount"`
    MinSubtotal      int64      `json:"min_subtotal"`
    StartsAt         *time.Time `json:"starts_at"`
    EndsAt           *time.Time `json:"ends_at"`
    MaxUses          *int       `json:"max_uses"`
    MaxUsesPerClient *int       `json:"max_uses_per_client"`
    IsActive         bool       `json:"is_active"`
    Uses             int        `json:"uses"`
    TotalDiscount    int64      `json:"total_discount"`
    CreatedAt        time.Time  `json:"created_at"`
}

// Request: amounts in paise; PercentBP in basis points (2000 = 20%).
type Request struct {
    Code             string     `json:"code"`
    Description      string     `json:"description"`
    Kind             string     `json:"kind"`
    PercentBP        *int       `json:"percent_bp"`
    Amount           *int64     `json:"amount"`
    MaxDiscount      *int64     `json:"max_discount"`
    MinSubtotal      int64      `json:"min_subtotal"`
    StartsAt         *time.Time `json:"starts_at"`
    EndsAt           *time.Time `json:"ends_at"`
    MaxUses          *int       `json:"max_uses"`
    MaxUsesPerClient *int       `json:"max_uses_per_client"`
    IsActive         bool       `json:"is_active"`
}

const (
    couponJSON = `
        to_jsonb(c) || jsonb_build_object(
            'uses', (SELECT count(*) FROM payments p WHERE p.coupon_id = c.id AND p.status IN ('paid', 'refunded')),
            'total_discount', (SELECT COALESCE(sum(p.discount), 0) FROM payments p WHERE p.coupon_id = c.id AND p.status IN ('paid', 'refunded'))
        )`

    listQuery = `SELECT COALESCE(jsonb_agg(` + couponJSON + ` ORDER BY c.created_at DESC), '[]'::jsonb) FROM coupons c;`
    getQuery  = `SELECT ` + couponJSON + ` FROM coupons c WHERE c.id = $1::uuid;`

    createQuery = `
        INSERT INTO coupons (code, description, kind, percent_bp, amount, max_discount, min_subtotal,
                             starts_at, ends_at, max_uses, max_uses_per_client, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id::text;
    `
    updateQuery = `
        UPDATE coupons
        SET code = $2, description = $3, kind = $4, percent_bp = $5, amount = $6, max_discount = $7,
            min_subtotal = $8, starts_at = $9, ends_at = $10, max_uses = $11, max_uses_per_client = $12,
            is_active = $13, updated_at = now()
        WHERE id = $1::uuid;
    `
    // Coupons that were used stay for the purchase history; deactivate them.
    deleteQuery = `
        DELETE FROM coupons c WHERE c.id = $1::uuid
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.coupon_id = c.id)
        RETURNING id;
    `
    existsQuery = `SELECT EXISTS (SELECT 1 FROM coupons WHERE id = $1::uuid);`
)

var (
    ErrInvalid = errors.New("invalid coupon")
    ErrTaken   = errors.New("a coupon with this code already exists")
    ErrUsed    = errors.New("this coupon has been used; deactivate it instead")

    codePattern = regexp.MustCompile(`^[A-Z0-9_-]{3,32}$`)
)

func invalid(msg string) error {
    return fmt.Errorf("%w: %s", ErrInvalid, msg)
}

func validate(req *Request) error {
    req.Code = pricing.NormalizeCouponCode(req.Code)
    req.Description = strings.TrimSpace(req.Description)
    switch {
    case !codePattern.MatchString(req.Code):
        return invalid("code must be 3 to 32 letters, digits, - or _")
    case req.MinSubtotal < 0:
        return invalid("minimum order cannot be negative")
    case req.StartsAt != nil && req.EndsAt != nil && !req.EndsAt.After(*req.StartsAt):
        return invalid("the end date must be after the start date")
    case req.MaxUses != nil && *req.MaxUses < 1, req.MaxUsesPerClient != nil && *req.MaxUsesPerClient < 1:
        return invalid("limits must be at least 1, or empty for no limit")
    }
    switch req.Kind {
    case "percent":
        if req.PercentBP == nil || *req.PercentBP < 1 || *req.PercentBP > 10000 {
            return invalid("percent must be between 0.01 and 100")
        }
        if req.MaxDiscount != nil && *req.MaxDiscount < 1 {
            return invalid("maximum discount must be positive, or empty for no cap")
        }
        req.Amount = nil
    case "flat":
        if req.Amount == nil || *req.Amount < 1 {
            return invalid("amount must be positive")
        }
        req.PercentBP, req.MaxDiscount = nil, nil
    default:
        return invalid("kind must be percent or flat")
    }
    return nil
}

func (h *App) args(req Request) []any {
    return []any{req.Code, req.Description, req.Kind, req.PercentBP, req.Amount, req.MaxDiscount, req.MinSubtotal,
        req.StartsAt, req.EndsAt, req.MaxUses, req.MaxUsesPerClient, req.IsActive}
}

func (h *App) get(ctx context.Context, id string) (*Coupon, error) {
    return postgres.QueryJSON[Coupon](ctx, h.DB, getQuery, id)
}

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/coupons")
    group.Get("", h.ListHandler)
    group.Post("", h.CreateHandler)
    group.Use("/:couponId", middlewares.UUIDParam("couponId"), h.requireCoupon)
    group.Patch("/:couponId", h.UpdateHandler)
    group.Delete("/:couponId", h.DeleteHandler)
}

func (h *App) requireCoupon(c *fiber.Ctx) error {
    var ok bool
    if err := h.DB.QueryRow(c.UserContext(), existsQuery, c.Params("couponId")).Scan(&ok); err != nil {
        return utils.ErrInternal(c, "failed to load coupon", err)
    }
    if !ok {
        return utils.ErrNotFound(c, "coupon not found", nil)
    }
    return c.Next()
}

func (h *App) ListHandler(c *fiber.Ctx) error {
    list, err := postgres.QueryJSONSlice[Coupon](c.UserContext(), h.DB, listQuery)
    if err != nil {
        return utils.ErrInternal(c, "failed to list coupons", err)
    }
    return utils.OK(c, "coupons retrieved", list)
}

func (h *App) CreateHandler(c *fiber.Ctx) error {
    var req Request
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    if err := validate(&req); err != nil {
        return couponError(c, err)
    }
    var id string
    if err := h.DB.QueryRow(c.UserContext(), createQuery, h.args(req)...).Scan(&id); err != nil {
        return couponError(c, postgres.MapPgError(err))
    }
    res, err := h.get(c.UserContext(), id)
    if err != nil {
        return couponError(c, err)
    }
    return utils.Created(c, "coupon created", res)
}

func (h *App) UpdateHandler(c *fiber.Ctx) error {
    var req Request
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    if err := validate(&req); err != nil {
        return couponError(c, err)
    }
    id := c.Params("couponId")
    if err := postgres.Exec(c.UserContext(), h.DB, updateQuery, append([]any{id}, h.args(req)...)...); err != nil {
        return couponError(c, err)
    }
    res, err := h.get(c.UserContext(), id)
    if err != nil {
        return couponError(c, err)
    }
    return utils.OK(c, "coupon saved", res)
}

func (h *App) DeleteHandler(c *fiber.Ctx) error {
    var id string
    err := h.DB.QueryRow(c.UserContext(), deleteQuery, c.Params("couponId")).Scan(&id)
    if errors.Is(postgres.MapPgError(err), postgres.ErrNotFound) {
        return couponError(c, ErrUsed)
    }
    if err != nil {
        return couponError(c, postgres.MapPgError(err))
    }
    return utils.OKEmpty(c, "coupon deleted")
}

func couponError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalid):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, postgres.ErrConflict):
        return utils.ErrConflict(c, ErrTaken.Error(), err)
    case errors.Is(err, ErrUsed):
        return utils.ErrConflict(c, err.Error(), err)
    case errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "coupon not found", err)
    }
    return utils.ErrInternal(c, "coupon request failed", err)
}
