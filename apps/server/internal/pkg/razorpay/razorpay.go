// Package razorpay is a small client for the Razorpay APIs used by
// application fees: orders, payments, Route transfers, refunds and Route
// linked accounts. Base URLs and keys come from config.
package razorpay

import (
    "bytes"
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "time"
)

var ErrNotConfigured = errors.New("payments are not configured")

// APIError is an error response from Razorpay.
type APIError struct {
    Status      int
    Code        string `json:"code"`
    Description string `json:"description"`
}

func (e *APIError) Error() string {
    if e.Description != "" {
        return "razorpay: " + e.Description
    }
    return fmt.Sprintf("razorpay: status %d", e.Status)
}

type Client struct {
    keyID, keySecret string
    v1, v2           string
    http             *http.Client
}

func New(keyID, keySecret, v1BaseURL, v2BaseURL string) *Client {
    return &Client{keyID: keyID, keySecret: keySecret, v1: v1BaseURL, v2: v2BaseURL, http: &http.Client{Timeout: 20 * time.Second}}
}

func (c *Client) Configured() bool { return c.keyID != "" && c.keySecret != "" }

// KeyID is public (the browser checkout needs it).
func (c *Client) KeyID() string { return c.keyID }

func (c *Client) do(ctx context.Context, method, url string, body, out any) error {
    if !c.Configured() {
        return ErrNotConfigured
    }
    var reader io.Reader
    if body != nil {
        raw, err := json.Marshal(body)
        if err != nil {
            return err
        }
        reader = bytes.NewReader(raw)
    }
    req, err := http.NewRequestWithContext(ctx, method, url, reader)
    if err != nil {
        return err
    }
    req.SetBasicAuth(c.keyID, c.keySecret)
    if body != nil {
        req.Header.Set("Content-Type", "application/json")
    }
    resp, err := c.http.Do(req)
    if err != nil {
        return fmt.Errorf("razorpay: %w", err)
    }
    defer resp.Body.Close()
    raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
    if resp.StatusCode >= 300 {
        var wrap struct {
            Error APIError `json:"error"`
        }
        _ = json.Unmarshal(raw, &wrap)
        wrap.Error.Status = resp.StatusCode
        return &wrap.Error
    }
    if out != nil {
        if err := json.Unmarshal(raw, out); err != nil {
            return fmt.Errorf("razorpay: decode: %w", err)
        }
    }
    return nil
}

// ---- Orders and payments ----

type Order struct {
    ID     string `json:"id"`
    Amount int64  `json:"amount"`
    Status string `json:"status"`
}

func (c *Client) CreateOrder(ctx context.Context, amount int64, currency, receipt string, notes map[string]string) (*Order, error) {
    var o Order
    err := c.do(ctx, http.MethodPost, c.v1+"/orders", map[string]any{
        "amount": amount, "currency": currency, "receipt": receipt, "notes": notes,
    }, &o)
    return &o, err
}

type Payment struct {
    ID      string `json:"id"`
    OrderID string `json:"order_id"`
    Status  string `json:"status"` // created, authorized, captured, refunded, failed
    Amount  int64  `json:"amount"`
    Fee     int64  `json:"fee"` // Razorpay fee including tax
    Tax     int64  `json:"tax"`
}

// OrderPayments lists the payments made against an order.
func (c *Client) OrderPayments(ctx context.Context, orderID string) ([]Payment, error) {
    var out struct {
        Items []Payment `json:"items"`
    }
    err := c.do(ctx, http.MethodGet, c.v1+"/orders/"+orderID+"/payments", nil, &out)
    return out.Items, err
}

func (c *Client) Payment(ctx context.Context, paymentID string) (*Payment, error) {
    var p Payment
    err := c.do(ctx, http.MethodGet, c.v1+"/payments/"+paymentID, nil, &p)
    return &p, err
}

// Transfer sends part of a captured payment to a Route linked account.
func (c *Client) Transfer(ctx context.Context, paymentID, account string, amount int64, currency string, notes map[string]string) (string, error) {
    var out struct {
        Items []struct {
            ID string `json:"id"`
        } `json:"items"`
    }
    err := c.do(ctx, http.MethodPost, c.v1+"/payments/"+paymentID+"/transfers", map[string]any{
        "transfers": []map[string]any{{"account": account, "amount": amount, "currency": currency, "notes": notes}},
    }, &out)
    if err != nil {
        return "", err
    }
    if len(out.Items) == 0 {
        return "", errors.New("razorpay: transfer not created")
    }
    return out.Items[0].ID, nil
}

// Refund refunds a payment in full; reverseAll also pulls back any Route
// transfer made from it.
func (c *Client) Refund(ctx context.Context, paymentID string, reverseAll bool, notes map[string]string) (string, error) {
    body := map[string]any{"notes": notes}
    if reverseAll {
        body["reverse_all"] = 1
    }
    var out struct {
        ID string `json:"id"`
    }
    err := c.do(ctx, http.MethodPost, c.v1+"/payments/"+paymentID+"/refund", body, &out)
    return out.ID, err
}

// ---- Route linked accounts (v2) ----

type AccountInput struct {
    Email             string
    Phone             string
    LegalBusinessName string
    BusinessType      string // individual, proprietorship, partnership, private_limited, ...
    ContactName       string
    ReferenceID       string // our organization id
    Category          string
    Subcategory       string
    Street1, Street2  string
    City, State       string
    PostalCode        string
    PAN               string
}

func (c *Client) CreateLinkedAccount(ctx context.Context, in AccountInput) (string, error) {
    profile := map[string]any{
        "category": in.Category, "subcategory": in.Subcategory,
        "addresses": map[string]any{"registered": map[string]any{
            "street1": in.Street1, "street2": in.Street2, "city": in.City, "state": in.State,
            "postal_code": in.PostalCode, "country": "IN",
        }},
    }
    body := map[string]any{
        "email": in.Email, "phone": in.Phone, "type": "route", "reference_id": in.ReferenceID,
        "legal_business_name": in.LegalBusinessName, "business_type": in.BusinessType,
        "contact_name": in.ContactName, "profile": profile,
    }
    if in.PAN != "" {
        body["legal_info"] = map[string]any{"pan": in.PAN}
    }
    var out struct {
        ID string `json:"id"`
    }
    err := c.do(ctx, http.MethodPost, c.v2+"/accounts", body, &out)
    return out.ID, err
}

func (c *Client) CreateStakeholder(ctx context.Context, account, name, email string) error {
    return c.do(ctx, http.MethodPost, c.v2+"/accounts/"+account+"/stakeholders", map[string]any{"name": name, "email": email}, nil)
}

type Product struct {
    ID               string `json:"id"`
    ActivationStatus string `json:"activation_status"`
}

// RequestRoute requests the Route product for a linked account.
func (c *Client) RequestRoute(ctx context.Context, account string) (*Product, error) {
    var p Product
    err := c.do(ctx, http.MethodPost, c.v2+"/accounts/"+account+"/products", map[string]any{"product_name": "route", "tnc_accepted": true}, &p)
    return &p, err
}

// SetSettlement gives Route the bank account for payouts.
func (c *Client) SetSettlement(ctx context.Context, account, productID, accountNumber, ifsc, beneficiary string) (*Product, error) {
    var p Product
    err := c.do(ctx, http.MethodPatch, c.v2+"/accounts/"+account+"/products/"+productID, map[string]any{
        "settlements": map[string]any{"account_number": accountNumber, "ifsc_code": ifsc, "beneficiary_name": beneficiary},
        "tnc_accepted": true,
    }, &p)
    return &p, err
}

func (c *Client) Product(ctx context.Context, account, productID string) (*Product, error) {
    var p Product
    err := c.do(ctx, http.MethodGet, c.v2+"/accounts/"+account+"/products/"+productID, nil, &p)
    return &p, err
}

// ---- Signatures ----

func hmacHex(data []byte, secret string) string {
    m := hmac.New(sha256.New, []byte(secret))
    m.Write(data)
    return hex.EncodeToString(m.Sum(nil))
}

// VerifyCheckout checks the signature the browser checkout returns.
func (c *Client) VerifyCheckout(orderID, paymentID, signature string) bool {
    want := hmacHex([]byte(orderID+"|"+paymentID), c.keySecret)
    return c.keySecret != "" && hmac.Equal([]byte(want), []byte(signature))
}
