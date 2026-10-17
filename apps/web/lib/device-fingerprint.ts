"use client";

// Simple auto-detected human readable browser & OS name
export function detectDeviceName(): string {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "Unknown Scanner Device";
    }

    const ua = navigator.userAgent;
    let browser = "Browser";
    let os = "Device";

    // Detect OS
    if (/iPhone/i.test(ua)) {
        os = "iPhone";
    } else if (/iPad/i.test(ua)) {
        os = "iPad";
    } else if (/Android/i.test(ua)) {
        os = "Android Device";
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
        os = "macOS";
    } else if (/Windows/i.test(ua)) {
        os = "Windows PC";
    } else if (/Linux/i.test(ua)) {
        os = "Linux PC";
    }

    // Detect Browser
    if (/Edg\//i.test(ua)) {
        browser = "Edge";
    } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
        browser = "Chrome";
    } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
        browser = "Safari";
    } else if (/Firefox\//i.test(ua)) {
        browser = "Firefox";
    } else if (/Opera|OPR\//i.test(ua)) {
        browser = "Opera";
    }

    return `${browser} on ${os}`;
}

// Generate a deterministic client hardware fingerprint
export async function getDeviceFingerprint(): Promise<string> {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return "fp_fallback_" + Math.random().toString(36).slice(2);
    }

    // Check cached fingerprint in localStorage first
    const cached = localStorage.getItem("device_fingerprint_id");
    if (cached) {
        return cached;
    }

    const components: string[] = [];

    components.push(navigator.userAgent || "");
    components.push(navigator.language || "");
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(String(navigator.hardwareConcurrency || 4));

    // Simple canvas fingerprint
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("IdentityCardScanner#2026", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("IdentityCardScanner#2026", 4, 17);
            components.push(canvas.toDataURL());
        }
    } catch {
        // Canvas not allowed or blocked
    }

    const rawString = components.join("|||");

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(rawString);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        const fp = "fp_" + hashHex.slice(0, 32);
        localStorage.setItem("device_fingerprint_id", fp);
        return fp;
    } catch {
        const fallback = "fp_" + Math.random().toString(36).slice(2, 12);
        localStorage.setItem("device_fingerprint_id", fallback);
        return fallback;
    }
}
