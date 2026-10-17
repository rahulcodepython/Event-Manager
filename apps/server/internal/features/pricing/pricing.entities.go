package pricing

// catalog is the active pricing data as loaded from the database.
type catalog struct {
    Currency          string    `json:"currency"`
    BaseFee           int64     `json:"base_fee"`
    TaxName           string    `json:"tax_name"`
    TaxRateBP         int       `json:"tax_rate_bp"`
    TrialMaxEventDays int       `json:"trial_max_event_days"`
    Features          []feature `json:"features"`
}

type feature struct {
    ID           string   `json:"id"`
    Key          string   `json:"key"`
    Name         string   `json:"name"`
    Description  string   `json:"description"`
    ValueType    string   `json:"value_type"`
    Unit         string   `json:"unit"`
    PricingType  string   `json:"pricing_type"`
    DefaultValue int      `json:"default_value"`
    TrialValue   int      `json:"trial_value"`
    Options      []option `json:"options"`
    Rates        []rate   `json:"rates"`
}

type option struct {
    Value int    `json:"value"`
    Label string `json:"label"`
}

type rate struct {
    MinValue int   `json:"min_value"`
    MaxValue *int  `json:"max_value"`
    UnitSize int   `json:"unit_size"`
    Price    int64 `json:"price"`
}

// CatalogResponse is what the purchase form renders. Amounts are in the
// smallest currency unit (paise).
type CatalogResponse struct {
    Currency  string `json:"currency"`
    BaseFee   int64  `json:"base_fee"`
    TaxName   string `json:"tax_name"`
    TaxRateBP int    `json:"tax_rate_bp"`
    // Free trial: each feature's TrialValue, events capped at this length.
    TrialMaxEventDays int              `json:"trial_max_event_days"`
    Features          []CatalogFeature `json:"features"`
}

type CatalogFeature struct {
    ID           string          `json:"id"`
    Key          string          `json:"key"`
    Name         string          `json:"name"`
    Description  string          `json:"description"`
    ValueType    string          `json:"value_type"`
    Unit         string          `json:"unit"`
    DefaultValue int             `json:"default_value"`
    TrialValue   int             `json:"trial_value"`
    Options      []CatalogOption `json:"options"`
}

type CatalogOption struct {
    Value int    `json:"value"`
    Label string `json:"label"`
    Price int64  `json:"price"`
}

type Selection struct {
    Key   string `json:"key"`
    Value int    `json:"value"`
}

type QuoteRequest struct {
    Selections []Selection `json:"selections"`
    // CouponCode (optional) previews a coupon's discount.
    CouponCode string `json:"coupon_code"`
}

type QuoteLine struct {
    FeatureID string `json:"feature_id"`
    Key       string `json:"key"`
    Name      string `json:"name"`
    Value     int    `json:"value"`
    Label     string `json:"label"`
    Amount    int64  `json:"amount"`
}

type Quote struct {
    Currency string      `json:"currency"`
    Lines    []QuoteLine `json:"lines"`
    BaseFee  int64       `json:"base_fee"`
    // Subtotal is before the discount; tax is on Subtotal - Discount.
    Subtotal int64          `json:"subtotal"`
    Discount int64          `json:"discount"`
    Coupon   *AppliedCoupon `json:"coupon,omitempty"`
    // CouponError: why a previewed coupon does not apply (quote endpoint only).
    CouponError string `json:"coupon_error,omitempty"`
    TaxName     string `json:"tax_name"`
    TaxRateBP   int    `json:"tax_rate_bp"`
    Tax         int64  `json:"tax"`
    Total       int64  `json:"total"`
}
