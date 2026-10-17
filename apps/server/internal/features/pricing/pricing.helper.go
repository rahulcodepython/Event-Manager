package pricing

// featurePrice returns what a feature costs at a value. The active rate
// whose [min_value, max_value] range holds the value decides the price;
// no matching rate means the value is free (e.g. 0 sub-events).
func featurePrice(f feature, value int) int64 {
    for _, r := range f.Rates {
        if value < r.MinValue || (r.MaxValue != nil && value > *r.MaxValue) {
            continue
        }
        if f.PricingType == "per_unit" {
            units := (value + r.UnitSize - 1) / r.UnitSize
            return r.Price * int64(units)
        }
        return r.Price // flat, tiered
    }
    return 0
}

// taxOn applies a basis-point rate, rounding half up to the smallest unit.
func taxOn(amount int64, rateBP int) int64 {
    return (amount*int64(rateBP) + 5000) / 10000
}
