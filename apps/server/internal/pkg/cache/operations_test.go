package cache

import (
    "context"
    "math"
    "testing"
    "time"
)

func TestAddJitter_RangeAndDistribution(t *testing.T) {
    base := 10 * time.Minute
    jitterPct := 0.20
    minExpected := time.Duration(float64(base) * (1.0 - jitterPct))
    maxExpected := time.Duration(float64(base) * (1.0 + jitterPct))

    const iterations = 2000
    results := make([]time.Duration, iterations)
    uniqueMap := make(map[time.Duration]bool)

    var sum float64
    for i := 0; i < iterations; i++ {
        val := AddJitter(base, jitterPct)
        results[i] = val
        uniqueMap[val] = true
        sum += float64(val)

        if val < minExpected || val > maxExpected {
            t.Fatalf("iteration %d: value %v is outside [%v, %v]", i, val, minExpected, maxExpected)
        }
    }

    // Verify entropy/dispersion: we shouldn't have identical values
    if len(uniqueMap) < iterations*9/10 {
        t.Fatalf("insufficient entropy in jitter: got %d unique values out of %d iterations", len(uniqueMap), iterations)
    }

    // Verify mean is roughly close to baseTTL
    mean := sum / float64(iterations)
    meanDiffPct := math.Abs(mean-float64(base)) / float64(base)
    if meanDiffPct > 0.05 {
        t.Fatalf("expected mean to be within 5%% of base %v, got %v (diff: %.2f%%)", base, time.Duration(mean), meanDiffPct*100)
    }
}

func TestAddJitter_EdgeCases(t *testing.T) {
    // Zero or negative base TTL
    if got := AddJitter(0, 0.20); got != 0 {
        t.Errorf("expected 0 for 0 base TTL, got %v", got)
    }
    if got := AddJitter(-5*time.Second, 0.20); got != -5*time.Second {
        t.Errorf("expected -5s for negative base TTL, got %v", got)
    }

    // Invalid jitter percentages fallback to default (20%)
    valNeg := AddJitter(10*time.Minute, -0.5)
    if valNeg < 8*time.Minute || valNeg > 12*time.Minute {
        t.Errorf("expected fallback to 20%% jitter for negative pct, got %v", valNeg)
    }

    valOver := AddJitter(10*time.Minute, 1.5)
    if valOver < 8*time.Minute || valOver > 12*time.Minute {
        t.Errorf("expected fallback to 20%% jitter for pct >= 1.0, got %v", valOver)
    }
}

func TestRemember_GracefulDegradationOnNilCache(t *testing.T) {
    ctx := context.Background()
    fetchCount := 0
    fetch := func() (string, error) {
        fetchCount++
        return "data_payload", nil
    }

    // With nil cache, Remember should invoke fetch directly without error
    val, err := Remember[string](ctx, nil, "any_key", 5*time.Minute, fetch)
    if err != nil {
        t.Fatalf("unexpected error with nil cache: %v", err)
    }
    if val != "data_payload" {
        t.Fatalf("expected data_payload, got %s", val)
    }
    if fetchCount != 1 {
        t.Fatalf("expected fetch to be called once, called %d times", fetchCount)
    }
}
