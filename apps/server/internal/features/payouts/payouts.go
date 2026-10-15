// Package payouts onboards an organizer to Razorpay Route: a linked account
// that receives application fees (minus Razorpay's fee and the platform
// fee). Bank details are sent to Razorpay and not stored, except the last
// four digits for display.
package payouts

import (
    "context"
    "errors"
    "fmt"
    "log/slog"
    "regexp"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/razorpay"
    "identitycard-server/internal/utils"
)

type App struct {
    DB       *pgxpool.Pool
    Razorpay *razorpay.Client
    // Category / Subcategory: RAZORPAY_ROUTE_CATEGORY / _SUBCATEGORY.
    Category, Subcategory string
    // RefreshEvery (PAYOUT_STATUS_REFRESH): how often a pending account
    // re-checks its Route status.
    RefreshEvery time.Duration
}

func NewApp(db *pgxpool.Pool, rp *razorpay.Client, category, subcategory string, refreshEvery time.Duration) *App {
    return &App{DB: db, Razorpay: rp, Category: category, Subcategory: subcategory, RefreshEvery: refreshEvery}
}

type Account struct {
    RazorpayAccountID string    `json:"razorpay_account_id"`
    Status            string    `json:"status"`
    Active            bool      `json:"active"`
    LegalBusinessName string    `json:"legal_business_name"`
    ContactName       string    `json:"contact_name"`
    Email             string    `json:"email"`
    Phone             string    `json:"phone"`
    BankAccountLast4  string    `json:"bank_account_last4"`
    IFSC              string    `json:"ifsc"`
    ProductID         string    `json:"-"`
    UpdatedAt         time.Time `json:"updated_at"`
}

type OnboardRequest struct {
    LegalBusinessName string `json:"legal_business_name"`
    BusinessType      string `json:"business_type"`
    ContactName       string `json:"contact_name"`
    Email             string `json:"email"`
    Phone             string `json:"phone"`
    PAN               string `json:"pan"`
    Street1           string `json:"street1"`
    Street2           string `json:"street2"`
    City              string `json:"city"`
    State             string `json:"state"`
    PostalCode        string `json:"postal_code"`
    AccountNumber     string `json:"account_number"`
    IFSC              string `json:"ifsc"`
    BeneficiaryName   string `json:"beneficiary_name"`
}

var (
    ErrInvalid        = errors.New("invalid payout details")
    ErrAlreadyCreated = errors.New("a payout account already exists")

    ifscPattern  = regexp.MustCompile(`^[A-Z]{4}0[A-Z0-9]{6}$`)
    panPattern   = regexp.MustCompile(`^[A-Z]{5}[0-9]{4}[A-Z]$`)
    digits       = regexp.MustCompile(`^[0-9]+$`)
    businessType = map[string]bool{
        "individual": true, "proprietorship": true, "partnership": true, "private_limited": true,
        "public_limited": true, "llp": true, "trust": true, "society": true, "ngo": true, "educational_institutes": true,
    }
)

const (
    accountJSON = `
        SELECT jsonb_build_object(
            'razorpay_account_id', razorpay_account_id, 'status', status, 'active', status = 'activated',
            'legal_business_name', legal_business_name, 'contact_name', contact_name, 'email', email,
            'phone', phone, 'bank_account_last4', bank_account_last4, 'ifsc', ifsc,
            'product_id', product_id, 'updated_at', updated_at
        ) FROM payout_accounts WHERE organization_id = $1::uuid;
    `
)

// AccountFor returns the organization's payout account, refreshing its
// status from Razorpay while it is not yet active. nil when none.
func (s *App) AccountFor(ctx context.Context, orgID string) (*Account, error) {
    a, err := postgres.QueryJSON[Account](ctx, s.DB, accountJSON, orgID)
    if errors.Is(err, postgres.ErrNotFound) {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    if !a.Active && a.ProductID != "" && time.Since(a.UpdatedAt) > s.RefreshEvery {
        if p, err := s.Razorpay.Product(ctx, a.RazorpayAccountID, a.ProductID); err == nil && p.ActivationStatus != "" {
            _ = postgres.Exec(ctx, s.DB, `UPDATE payout_accounts SET status = $2, updated_at = now() WHERE organization_id = $1::uuid`, orgID, p.ActivationStatus)
            a.Status, a.Active, a.UpdatedAt = p.ActivationStatus, p.ActivationStatus == "activated", time.Now()
        } else if err != nil {
            slog.Warn("payouts: refresh status", "org", orgID, "error", err)
        }
    }
    return a, nil
}

// ActiveAccountID is the linked account that receives this event's fees,
// or "" when the organizer cannot take payments yet.
func (s *App) ActiveAccountID(ctx context.Context, eventID string) (string, error) {
    var orgID string
    if err := s.DB.QueryRow(ctx, `SELECT organization_id::text FROM events WHERE id = $1::uuid`, eventID).Scan(&orgID); err != nil {
        return "", postgres.MapPgError(err)
    }
    a, err := s.AccountFor(ctx, orgID)
    if err != nil || a == nil || !a.Active {
        return "", err
    }
    return a.RazorpayAccountID, nil
}

func normalize(r *OnboardRequest) error {
    trim := func(v *string) { *v = strings.TrimSpace(*v) }
    for _, v := range []*string{&r.LegalBusinessName, &r.BusinessType, &r.ContactName, &r.Email, &r.Phone, &r.PAN,
        &r.Street1, &r.Street2, &r.City, &r.State, &r.PostalCode, &r.AccountNumber, &r.IFSC, &r.BeneficiaryName} {
        trim(v)
    }
    r.IFSC, r.PAN = strings.ToUpper(r.IFSC), strings.ToUpper(r.PAN)
    r.Phone = strings.TrimPrefix(strings.ReplaceAll(r.Phone, " ", ""), "+91")
    switch {
    case r.LegalBusinessName == "" || r.ContactName == "" || r.BeneficiaryName == "":
        return fmt.Errorf("%w: business name, contact name and account holder name are required", ErrInvalid)
    case !businessType[r.BusinessType]:
        return fmt.Errorf("%w: choose a business type", ErrInvalid)
    case !strings.Contains(r.Email, "@"):
        return fmt.Errorf("%w: invalid email", ErrInvalid)
    case len(r.Phone) != 10 || !digits.MatchString(r.Phone):
        return fmt.Errorf("%w: phone must be a 10-digit mobile number", ErrInvalid)
    case r.PAN != "" && !panPattern.MatchString(r.PAN):
        return fmt.Errorf("%w: invalid PAN", ErrInvalid)
    case r.Street1 == "" || r.City == "" || r.State == "" || len(r.PostalCode) != 6 || !digits.MatchString(r.PostalCode):
        return fmt.Errorf("%w: complete the address (6-digit PIN code)", ErrInvalid)
    case len(r.AccountNumber) < 6 || len(r.AccountNumber) > 20 || !digits.MatchString(r.AccountNumber):
        return fmt.Errorf("%w: invalid bank account number", ErrInvalid)
    case !ifscPattern.MatchString(r.IFSC):
        return fmt.Errorf("%w: invalid IFSC", ErrInvalid)
    }
    return nil
}

// OnboardService creates the linked account, requests Route and sets the
// settlement bank account.
func (s *App) OnboardService(ctx context.Context, orgID string, req OnboardRequest) (*Account, error) {
    if err := normalize(&req); err != nil {
        return nil, err
    }
    if existing, err := s.AccountFor(ctx, orgID); err != nil {
        return nil, err
    } else if existing != nil {
        return nil, ErrAlreadyCreated
    }

    accountID, err := s.Razorpay.CreateLinkedAccount(ctx, razorpay.AccountInput{
        Email: req.Email, Phone: req.Phone, LegalBusinessName: req.LegalBusinessName, BusinessType: req.BusinessType,
        ContactName: req.ContactName, ReferenceID: strings.ReplaceAll(orgID, "-", "")[:20],
        Category: s.Category, Subcategory: s.Subcategory,
        Street1: req.Street1, Street2: req.Street2, City: req.City, State: req.State, PostalCode: req.PostalCode, PAN: req.PAN,
    })
    if err != nil {
        return nil, err
    }
    if err := s.Razorpay.CreateStakeholder(ctx, accountID, req.ContactName, req.Email); err != nil {
        slog.Warn("payouts: stakeholder", "account", accountID, "error", err)
    }
    status, productID := "created", ""
    if p, err := s.Razorpay.RequestRoute(ctx, accountID); err == nil {
        productID, status = p.ID, p.ActivationStatus
        if p2, err := s.Razorpay.SetSettlement(ctx, accountID, p.ID, req.AccountNumber, req.IFSC, req.BeneficiaryName); err == nil {
            status = p2.ActivationStatus
        } else {
            return nil, err
        }
    } else {
        return nil, err
    }

    last4 := req.AccountNumber[len(req.AccountNumber)-4:]
    err = postgres.Exec(ctx, s.DB, `
        INSERT INTO payout_accounts (organization_id, razorpay_account_id, product_id, status, legal_business_name,
                                     contact_name, email, phone, bank_account_last4, ifsc)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        orgID, accountID, productID, status, req.LegalBusinessName, req.ContactName, req.Email, req.Phone, last4, req.IFSC)
    if err != nil {
        return nil, err
    }
    return s.AccountFor(ctx, orgID)
}

// ---- HTTP ----

func (h *App) RegisterRoutes(r fiber.Router) {
    r.Get("/payouts", h.GetHandler)
    r.Post("/payouts", h.OnboardHandler)
}

func (h *App) GetHandler(c *fiber.Ctx) error {
    a, err := h.AccountFor(c.UserContext(), middlewares.OrgID(c))
    if err != nil {
        return utils.ErrInternal(c, "failed to load payout account", err)
    }
    return utils.OK(c, "payout account", fiber.Map{"account": a, "configured": h.Razorpay.Configured()})
}

func (h *App) OnboardHandler(c *fiber.Ctx) error {
    var req OnboardRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    a, err := h.OnboardService(c.UserContext(), middlewares.OrgID(c), req)
    if err != nil {
        var apiErr *razorpay.APIError
        switch {
        case errors.Is(err, ErrInvalid):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.Is(err, ErrAlreadyCreated):
            return utils.ErrConflict(c, err.Error(), err)
        case errors.Is(err, razorpay.ErrNotConfigured):
            return utils.Respond(c, fiber.StatusServiceUnavailable, false, err.Error(), any(nil), err)
        case errors.As(err, &apiErr):
            return utils.ErrBadRequest(c, apiErr.Error(), err)
        }
        return utils.ErrInternal(c, "failed to set up payouts", err)
    }
    return utils.Created(c, "payout account created", a)
}
