package devices

import (
    "context"
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "math/big"
    "time"
)

const (
    rateLimitWindowSec = 60
    maxVerifyPerWindow = 10
    maxFailedAttempts  = 5
    lockoutDurationSec = 15 * 60
)

func generatePIN() (string, error) {
    n, err := rand.Int(rand.Reader, big.NewInt(900000))
    if err != nil {
        return "", err
    }
    return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func generateDeviceToken() (string, string, error) {
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        return "", "", err
    }
    token := "dev_" + hex.EncodeToString(bytes)
    hashBytes := sha256.Sum256([]byte(token))
    return token, hex.EncodeToString(hashBytes[:]), nil
}

func hashToken(token string) string {
    hashBytes := sha256.Sum256([]byte(token))
    return hex.EncodeToString(hashBytes[:])
}

func (s *App) checkVerifyRateLimit(ctx context.Context, clientIP string) error {
    if s.Redis == nil {
        return nil
    }

    lockKey := fmt.Sprintf("rate:verify:lockout:%s", clientIP)
    isLocked, err := s.Redis.Exists(ctx, lockKey).Result()
    if err == nil && isLocked > 0 {
        return ErrTooManyWrongGuesses
    }

    windowKey := fmt.Sprintf("rate:verify:window:%s", clientIP)
    count, err := s.Redis.Incr(ctx, windowKey).Result()
    if err == nil {
        if count == 1 {
            s.Redis.Expire(ctx, windowKey, rateLimitWindowSec*time.Second)
        }
        if count > maxVerifyPerWindow {
            return ErrRateLimitExceeded
        }
    }

    return nil
}

func (s *App) recordFailedVerifyAttempt(ctx context.Context, clientIP, pin string) (bool, error) {
    if s.Redis == nil {
        return false, nil
    }

    failKey := fmt.Sprintf("rate:verify:failures:%s", clientIP)
    fails, err := s.Redis.Incr(ctx, failKey).Result()
    if err != nil {
        return false, err
    }

    if fails == 1 {
        s.Redis.Expire(ctx, failKey, lockoutDurationSec*time.Second)
    }

    if fails >= maxFailedAttempts {
        lockKey := fmt.Sprintf("rate:verify:lockout:%s", clientIP)
        s.Redis.Set(ctx, lockKey, "locked", lockoutDurationSec*time.Second)
        s.Redis.Del(ctx, failKey)
        return true, nil
    }

    return false, nil
}

func (s *App) clearFailedVerifyAttempts(ctx context.Context, clientIP string) {
    if s.Redis == nil {
        return
    }
    failKey := fmt.Sprintf("rate:verify:failures:%s", clientIP)
    lockKey := fmt.Sprintf("rate:verify:lockout:%s", clientIP)
    s.Redis.Del(ctx, failKey, lockKey)
}
