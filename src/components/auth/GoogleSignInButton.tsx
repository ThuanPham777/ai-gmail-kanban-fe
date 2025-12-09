import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { loginFullWithGoogle } from "@/lib/api";

const SCRIPT_ID = "google-identity-services";

const GMAIL_SCOPE = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
].join(" ");

interface Props {
    onSuccess: (data: any) => void;
    disabled?: boolean;
}

function loadGsiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) return resolve();

        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Failed to load GSI script")), {
                once: true,
            });
            return;
        }

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load GSI script"));
        document.head.appendChild(script);
    });
}

export function GoogleSigninButton({ onSuccess, disabled }: Props) {
    const codeClientRef = useRef<google.accounts.oauth2.CodeClient | null>(null);

    const initClient = useCallback(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error("Missing VITE_GOOGLE_CLIENT_ID");
            return;
        }

        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
            console.error("Google OAuth2 not available on window.google");
            return;
        }

        codeClientRef.current = oauth2.initCodeClient({
            client_id: clientId,
            scope: GMAIL_SCOPE,
            ux_mode: "popup",
            access_type: "offline",
            prompt: "consent",
            callback: async (resp) => {
                try {
                    if (!resp.code) {
                        console.error("No authorization code returned", resp.error);
                        return;
                    }
                    const res = await loginFullWithGoogle(resp.code);
                    onSuccess(res);
                } catch (e) {
                    console.error(e);
                }
            },
        });
    }, [onSuccess]);

    useEffect(() => {
        let mounted = true;

        loadGsiScript()
            .then(() => {
                if (!mounted) return;
                initClient();
            })
            .catch((err) => console.error(err));

        return () => {
            mounted = false;
        };
    }, [initClient]);

    const handleClick = () => {
        if (!codeClientRef.current) {
            console.warn("Code client not initialized yet");
            return;
        }
        codeClientRef.current.requestCode();
    };

    return (
        <Button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="w-full"
            variant="outline"
        >
            Login with Google
        </Button>
    );
}
