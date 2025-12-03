import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
    onCredential: (credential: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
}

const SCRIPT_ID = 'google-identity-services';

export function GoogleSignInButton({ onCredential, disabled, isLoading }: GoogleSignInButtonProps) {
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const scriptReady = useRef(false);

    const initializeButton = useCallback(() => {
        if (disabled || !buttonRef.current || !window.google || scriptReady.current) return;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: google.accounts.id.CredentialResponse) => {
                if (response.credential) {
                    onCredential(response.credential);
                }
            },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: buttonRef.current.clientWidth || 280,
        });
        scriptReady.current = true;
    }, [disabled, onCredential]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.google) {
            initializeButton();
            return;
        }

        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', initializeButton, { once: true });
            return () => existing.removeEventListener('load', initializeButton);
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = SCRIPT_ID;
        script.onload = initializeButton;
        document.head.appendChild(script);

        return () => {
            script.onload = null;
        };
    }, [initializeButton]);

    return (
        <div className="relative w-full">
            <div ref={buttonRef} className={disabled ? 'pointer-events-none opacity-60' : ''} />
            {(isLoading || !scriptReady.current) && (
                <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full absolute inset-0 flex items-center justify-center gap-2"
                >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Google Sign-In
                </Button>
            )}
        </div>
    );
}
