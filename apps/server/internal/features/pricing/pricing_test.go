package pricing

import "testing"

func intPtr(v int) *int { return &v }

func TestFeaturePrice(t *testing.T) {
    tiered := feature{PricingType: "tiered", Rates: []rate{
        {MinValue: 1, MaxValue: intPtr(100), UnitSize: 1, Price: 29900},
        {MinValue: 101, MaxValue: intPtr(250), UnitSize: 1, Price: 59900},
    }}
    perUnit := feature{PricingType: "per_unit", Rates: []rate{{MinValue: 0, UnitSize: 1, Price: 19900}}}
    perBlock := feature{PricingType: "per_unit", Rates: []rate{{MinValue: 0, UnitSize: 100, Price: 1000}}}
    flat := feature{PricingType: "flat", Rates: []rate{{MinValue: 1, UnitSize: 1, Price: 99900}}}

    cases := []struct {
        name  string
        f     feature
        value int
        want  int64
    }{
        {"tiered first band", tiered, 100, 29900},
        {"tiered second band", tiered, 250, 59900},
        {"tiered outside bands is free", tiered, 0, 0},
        {"per unit days", perUnit, 7, 7 * 19900},
        {"per unit rounds blocks up", perBlock, 150, 2 * 1000},
        {"flat on", flat, 1, 99900},
        {"flat off", flat, 0, 0},
    }
    for _, tc := range cases {
        if got := featurePrice(tc.f, tc.value); got != tc.want {
            t.Errorf("%s: got %d, want %d", tc.name, got, tc.want)
        }
    }
}

func TestTaxOn(t *testing.T) {
    if got := taxOn(100000, 1800); got != 18000 {
        t.Errorf("18%% of 1000.00: got %d", got)
    }
    if got := taxOn(99, 1800); got != 18 { // 17.82 rounds to 18
        t.Errorf("rounding: got %d", got)
    }
}
