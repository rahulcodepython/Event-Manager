package catalog

// Catalog is the admin view: every feature with all its options and rates,
// active or not. Amounts are in paise.
type Catalog struct {
    Settings Settings  `json:"settings"`
    Features []Feature `json:"features"`
}

type Settings struct {
    Currency          string `json:"currency"`
    BaseFee           int64  `json:"base_fee"`
    TaxName           string `json:"tax_name"`
    TaxRateBP         int    `json:"tax_rate_bp"`
    TrialMaxEventDays int    `json:"trial_max_event_days"`
}

type Feature struct {
    ID           string   `json:"id"`
    Key          string   `json:"key"`
    Name         string   `json:"name"`
    Description  string   `json:"description"`
    ValueType    string   `json:"value_type"`
    Unit         string   `json:"unit"`
    PricingType  string   `json:"pricing_type"`
    DefaultValue int      `json:"default_value"`
    TrialValue   int      `json:"trial_value"`
    SortOrder    int      `json:"sort_order"`
    Options      []Option `json:"options"`
    Rates        []Rate   `json:"rates"`
}

type Option struct {
    Value    int    `json:"value"`
    Label    string `json:"label"`
    IsActive bool   `json:"is_active"`
}

type Rate struct {
    MinValue int   `json:"min_value"`
    MaxValue *int  `json:"max_value"`
    UnitSize int   `json:"unit_size"`
    Price    int64 `json:"price"`
}

type UpdateSettingsRequest struct {
    BaseFee           int64  `json:"base_fee"`
    TaxName           string `json:"tax_name"`
    TaxRateBP         int    `json:"tax_rate_bp"`
    TrialMaxEventDays int    `json:"trial_max_event_days"`
}

// UpdateFeatureRequest replaces a feature's editable fields, options (in
// display order) and rates in one go.
type UpdateFeatureRequest struct {
    Name         string   `json:"name"`
    Description  string   `json:"description"`
    Unit         string   `json:"unit"`
    PricingType  string   `json:"pricing_type"`
    DefaultValue int      `json:"default_value"`
    TrialValue   int      `json:"trial_value"`
    Options      []Option `json:"options"`
    Rates        []Rate   `json:"rates"`
}
