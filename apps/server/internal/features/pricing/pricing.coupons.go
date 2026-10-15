package pricing

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "identitycard-server/internal/pkg/postgres"
)

// ErrCoupon matches every reason a coupon cannot be used (errors.Is); the
// error's message is the reason, shown to the client.
var ErrCoupon = errors.New("coupon cannot be used")

type couponError struct{ msg string }

func (e *couponError) Error() string        { return e.msg }
func (e *couponError) Is(target error) bool { return target == ErrCoupon }

// AppliedCoupon is the coupon on a quote. ID stays server-side.
type AppliedCoupon struct {
    ID          string `json:"-"`
    Code        string `json:"code"`
    Description string `json:"description"`
}

type couponRow struct {
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
    ClientUses       int        `json:"client_uses"`
}

// Uses: completed purchases with the coupon (refunded ones still count).
const couponQuery = `
    SELECT to_jsonb(c) || jsonb_build_object(
        'uses', (SELECT count(*) FROM payments p WHERE p.coupon_id = c.id AND p.status IN ('paid', 'refunded')),
        'client_uses', (SELECT count(*) FROM payments p WHERE p.coupon_id = c.id AND p.status IN ('paid', 'refunded')
                        AND $2 <> '' AND p.organization_id::text = $2)
    )
    FROM coupons c
    WHERE c.code = $1;
`

func couponErr(format string, args ...any) error {
    return &couponError{msg: fmt.Sprintf(format, args...)}
}

// NormalizeCouponCode is how codes are stored and matched.
func NormalizeCouponCode(code string) string {
    return strings.ToUpper(strings.TrimSpace(code))
}

// ApplyCoupon checks a coupon for this quote and applies its discount:
// tax is recomputed on the discounted subtotal. orgID "" skips the
// per-client limit (public preview).
func (s *App) ApplyCoupon(ctx context.Context, q *Quote, code, orgID string) error {
    code = NormalizeCouponCode(code)
    c, err := postgres.QueryJSON[couponRow](ctx, s.DB, couponQuery, code, orgID)
    if errors.Is(err, postgres.ErrNotFound) {
        return couponErr("this code is not valid")
    }
    if err != nil {
        return err
    }

    now := time.Now()
    switch {
    case !c.IsActive:
        return couponErr("this code is not valid")
    case c.StartsAt != nil && now.Before(*c.StartsAt):
        return couponErr("this code is not active yet")
    case c.EndsAt != nil && !now.Before(*c.EndsAt):
        return couponErr("this code has expired")
    case c.MaxUses != nil && c.Uses >= *c.MaxUses:
        return couponErr("this code has been fully used")
    case orgID != "" && c.MaxUsesPerClient != nil && c.ClientUses >= *c.MaxUsesPerClient:
        return couponErr("you have already used this code")
    case q.Subtotal < c.MinSubtotal:
        return couponErr("this code needs an order of at least %s before tax", rupees(c.MinSubtotal))
    }

    q.Discount = couponDiscount(c, q.Subtotal)
    q.Tax = taxOn(q.Subtotal-q.Discount, q.TaxRateBP)
    q.Total = q.Subtotal - q.Discount + q.Tax
    q.Coupon = &AppliedCoupon{ID: c.ID, Code: c.Code, Description: c.Description}
    return nil
}

// couponDiscount never exceeds the subtotal.
func couponDiscount(c *couponRow, subtotal int64) int64 {
    var d int64
    switch c.Kind {
    case "percent":
        if c.PercentBP != nil {
            d = subtotal * int64(*c.PercentBP) / 10000
        }
        if c.MaxDiscount != nil && d > *c.MaxDiscount {
            d = *c.MaxDiscount
        }
    case "flat":
        if c.Amount != nil {
            d = *c.Amount
        }
    }
    return min(d, subtotal)
}

func rupees(paise int64) string {
    if paise%100 == 0 {
        return fmt.Sprintf("₹%d", paise/100)
    }
    return fmt.Sprintf("₹%d.%02d", paise/100, paise%100)
}
