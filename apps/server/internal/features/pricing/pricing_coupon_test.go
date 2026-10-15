package pricing

import "testing"

func TestCouponDiscount(t *testing.T) {
    bp := func(v int) *int { return &v }
    amt := func(v int64) *int64 { return &v }
    cases := []struct {
        name     string
        c        couponRow
        subtotal int64
        want     int64
    }{
        {"20 percent", couponRow{Kind: "percent", PercentBP: bp(2000)}, 100000, 20000},
        {"percent capped", couponRow{Kind: "percent", PercentBP: bp(5000), MaxDiscount: amt(10000)}, 100000, 10000},
        {"100 percent", couponRow{Kind: "percent", PercentBP: bp(10000)}, 54900, 54900},
        {"flat", couponRow{Kind: "flat", Amount: amt(50000)}, 100000, 50000},
        {"flat above subtotal", couponRow{Kind: "flat", Amount: amt(200000)}, 100000, 100000},
        {"rounds down", couponRow{Kind: "percent", PercentBP: bp(3333)}, 99, 32},
    }
    for _, tc := range cases {
        if got := couponDiscount(&tc.c, tc.subtotal); got != tc.want {
            t.Errorf("%s: got %d want %d", tc.name, got, tc.want)
        }
    }
}
