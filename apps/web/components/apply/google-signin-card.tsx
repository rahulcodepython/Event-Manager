"use client";

import * as React from "react";
import { Loader2, ShieldCheckIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { startIntent, useSignInMutation } from "../../query-hooks/applyflow.api";

type GoogleId = {
    initialize: (config: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
    interface Window {
        google?: { accounts: { id: GoogleId } };
    }
}

const GSI_SCRIPT = process.env.NEXT_PUBLIC_GOOGLE_GSI_SCRIPT_URL || "https://accounts.google.com/gsi/client";

// In-app browsers (Instagram, Facebook, WhatsApp...) block Google's popup,
// so sign in by redirect there.
const IN_APP = /FBAN|FBAV|Instagram|Line\/|WhatsApp|; wv\)/i;

function loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT}"]`);
        const script = existing ?? document.createElement("script");
        script.addEventListener("load", () => resolve());
        script.addEventListener("error", () => reject(new Error("Google sign-in could not load.")));
        if (!existing) {
            script.src = GSI_SCRIPT;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

/**
 * "Continue with Google": name, email and picture come from Google and are
 * required. Nothing is stored in the browser; the API keeps a short sign-in
 * cookie so a reload resumes the application.
 */
export function GoogleSignInCard({ formId, error }: { formId: string, error?: string | null }) {
    const buttonRef = React.useRef<HTMLDivElement>(null);
    const signIn = useSignInMutation(formId);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [intent] = await Promise.all([startIntent(formId), loadScript()]);
                if (cancelled || !buttonRef.current || !window.google) return;
                const redirect = IN_APP.test(navigator.userAgent);
                window.google.accounts.id.initialize({
                    client_id: intent.client_id,
                    nonce: intent.nonce,
                    ux_mode: redirect ? "redirect" : "popup",
                    login_uri: intent.login_uri,
                    callback: (res: { credential: string }) => signIn.mutate(res.credential),
                });
                window.google.accounts.id.renderButton(buttonRef.current, {
                    type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 280,
                });
                setReady(true);
            } catch (e) {
                if (!cancelled) setLoadError((e as Error).message);
            }
        })();
        return () => {
            cancelled = true;
        };
        // signIn.mutate is stable enough for a one-time setup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formId]);

    const message = error || loadError;

    return (
        <Card className="shadow-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-lg">Sign in to apply</CardTitle>
                <CardDescription>
                    Your name, email and photo are taken from your Google account. Your progress is saved, so you can come back and continue.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
                <div ref={buttonRef} className="min-h-11" />
                {
                    (!ready || signIn.isPending) && !message && <Loader2 className="size-5 animate-spin text-muted-foreground" />
                }
                {
                    message && <p className="text-center text-xs text-destructive">{message}</p>
                }
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheckIcon className="size-3.5" />
                    One registration per Google account
                </p>
            </CardContent>
        </Card>
    );
}
