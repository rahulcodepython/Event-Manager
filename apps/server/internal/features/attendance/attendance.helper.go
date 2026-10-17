package attendance

import (
    "crypto/sha256"
    "encoding/hex"
)

// hashDeviceToken generates a SHA256 hex digest of the raw device bearer token
// to match against the stored token_hash in event_devices / devices tables.
func hashDeviceToken(token string) string {
    hashBytes := sha256.Sum256([]byte(token))
    return hex.EncodeToString(hashBytes[:])
}
