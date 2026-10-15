package uploads

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "strings"
)

// token binds a pending object to one form field, so a token cannot be
// reused for another form or field, or point at someone else's file.
func (s *App) sign(formID, fieldKey, objectKey string) string {
    body := base64.RawURLEncoding.EncodeToString([]byte(objectKey))
    return "up1." + body + "." + base64.RawURLEncoding.EncodeToString(s.mac(formID, fieldKey, objectKey))
}

func (s *App) mac(formID, fieldKey, objectKey string) []byte {
    h := hmac.New(sha256.New, s.key)
    h.Write([]byte(formID + "|" + fieldKey + "|" + objectKey))
    return h.Sum(nil)
}

// verify returns the pending object key of a token issued for this field.
func (s *App) verify(formID, fieldKey, token string) (string, bool) {
    parts := strings.Split(token, ".")
    if len(parts) != 3 || parts[0] != "up1" {
        return "", false
    }
    raw, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil {
        return "", false
    }
    sig, err := base64.RawURLEncoding.DecodeString(parts[2])
    if err != nil {
        return "", false
    }
    objectKey := string(raw)
    if !strings.HasPrefix(objectKey, pendingPrefix) || !hmac.Equal(sig, s.mac(formID, fieldKey, objectKey)) {
        return "", false
    }
    return objectKey, true
}
