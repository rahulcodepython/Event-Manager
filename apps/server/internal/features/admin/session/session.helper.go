package session

import (
    "crypto/sha256"
    "crypto/subtle"
)

const (
    redisKeyFailedLogins = "admin_auth:failed:%s" // ip -> failed attempts
)

// equal compares two secrets in constant time, whatever their lengths.
func equal(a, b string) bool {
    ha := sha256.Sum256([]byte(a))
    hb := sha256.Sum256([]byte(b))
    return subtle.ConstantTimeCompare(ha[:], hb[:]) == 1
}
