package middlewares

import (
    "net"
    "testing"

    "github.com/gofiber/fiber/v2"
    "github.com/valyala/fasthttp"
)

func TestRateLimiter_DockerProxyClientIPExtraction(t *testing.T) {
    // Emulate Docker bridge network where reverse proxy (Caddy/Nginx/Traefik) has IP 172.18.0.2
    dockerProxyIP := net.ParseIP("172.18.0.2")
    trustedCIDRs := []string{
        "127.0.0.1/8",
        "::1/128",
        "10.0.0.0/8",
        "172.16.0.0/12", // Covers Docker bridge 172.18.0.2
        "192.168.0.0/16",
        "fc00::/7",
    }

    app := fiber.New(fiber.Config{
        EnableTrustedProxyCheck: true,
        TrustedProxies:          trustedCIDRs,
        ProxyHeader:             fiber.HeaderXForwardedFor,
    })

    // 1. Client A from 203.0.113.50 forwarded through Docker proxy 172.18.0.2
    fctxA := &fasthttp.RequestCtx{}
    fctxA.SetRemoteAddr(&net.TCPAddr{IP: dockerProxyIP, Port: 54321})
    fctxA.Request.Header.Set(fiber.HeaderXForwardedFor, "203.0.113.50")
    cA := app.AcquireCtx(fctxA)
    defer app.ReleaseCtx(cA)

    if !cA.IsProxyTrusted() {
        t.Fatalf("expected Docker proxy IP %s to be trusted under CIDR 172.16.0.0/12", dockerProxyIP)
    }
    if cA.IP() != "203.0.113.50" {
        t.Fatalf("expected real client IP 203.0.113.50, got %s", cA.IP())
    }

    // 2. Client B from 198.51.100.99 forwarded through same Docker proxy 172.18.0.2
    fctxB := &fasthttp.RequestCtx{}
    fctxB.SetRemoteAddr(&net.TCPAddr{IP: dockerProxyIP, Port: 54322})
    fctxB.Request.Header.Set(fiber.HeaderXForwardedFor, "198.51.100.99")
    cB := app.AcquireCtx(fctxB)
    defer app.ReleaseCtx(cB)

    if cB.IP() != "198.51.100.99" {
        t.Fatalf("expected real client IP 198.51.100.99, got %s", cB.IP())
    }
}

func TestRateLimiter_UntrustedProxyFallsBackToSocketIP(t *testing.T) {
    // If a request comes from an untrusted public IP pretending to be a proxy,
    // Fiber must ignore X-Forwarded-For spoofing and use RemoteAddr.
    untrustedRemoteIP := net.ParseIP("198.51.100.1")
    trustedCIDRs := []string{
        "127.0.0.1/8",
        "::1/128",
        "172.16.0.0/12",
    }

    app := fiber.New(fiber.Config{
        EnableTrustedProxyCheck: true,
        TrustedProxies:          trustedCIDRs,
        ProxyHeader:             fiber.HeaderXForwardedFor,
    })

    fctx := &fasthttp.RequestCtx{}
    fctx.SetRemoteAddr(&net.TCPAddr{IP: untrustedRemoteIP, Port: 54321})
    fctx.Request.Header.Set(fiber.HeaderXForwardedFor, "1.1.1.1") // Attempted spoof
    c := app.AcquireCtx(fctx)
    defer app.ReleaseCtx(c)

    if c.IsProxyTrusted() {
        t.Fatalf("expected untrusted IP %s to NOT be trusted", untrustedRemoteIP)
    }
    if c.IP() != "198.51.100.1" {
        t.Fatalf("expected socket IP 198.51.100.1 to be used because proxy is untrusted, got %s", c.IP())
    }
}
