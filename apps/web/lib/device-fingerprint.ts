"use client";

import { STORAGE_KEYS } from "./constants";

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
/**
 * A random ID for this browser install, kept in localStorage. It is not
 * derived from the hardware, so two identical phones never share one.
 */
export async function getDeviceFingerprint(): Promise<string> {
    if (typeof window === "undefined") {
        return "fp_" + crypto.randomUUID();
    }
    const cached = localStorage.getItem(STORAGE_KEYS.DEVICE_INSTALL_ID);
    if (cached) {
        return cached;
    }
    const id = "fp_" + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.DEVICE_INSTALL_ID, id);
    return id;
}
