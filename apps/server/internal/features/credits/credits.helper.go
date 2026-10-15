package credits

import (
    "bytes"
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
)

const razorpayOrdersURL = "https://api.razorpay.com/v1/orders"

type razorpayOrder struct {
    ID string `json:"id"`
}

// createRazorpayOrder registers the payable amount with Razorpay so the
// checkout popup can only charge exactly that.
func (s *App) createRazorpayOrder(ctx context.Context, amount int64, currency, receipt string) (string, error) {
    body, err := json.Marshal(map[string]any{"amount": amount, "currency": currency, "receipt": receipt})
    if err != nil {
        return "", err
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, razorpayOrdersURL, bytes.NewReader(body))
    if err != nil {
        return "", err
    }
    req.SetBasicAuth(s.Cfg.RazorpayKeyID, s.Cfg.RazorpayKeySecret)
    req.Header.Set("Content-Type", "application/json")

    resp, err := s.HTTP.Do(req)
    if err != nil {
        return "", fmt.Errorf("razorpay create order: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("razorpay create order: status %d", resp.StatusCode)
    }

    var order razorpayOrder
    if err := json.NewDecoder(resp.Body).Decode(&order); err != nil {
        return "", fmt.Errorf("razorpay create order decode: %w", err)
    }
    return order.ID, nil
}

// validSignature checks a hex HMAC-SHA256 of message with secret.
func validSignature(message []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(message)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}
