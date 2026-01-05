/**
 * GoogleSignInButton Component
 *
 * OAuth2 sign-in button for Google authentication.
 * Features:
 * - Loads Google Identity Services (GIS) script dynamically
 * - OAuth2 code flow with refresh token
 * - Gmail API scopes (read, modify, send)
 * - Popup-based authentication
 * - Branded Google button design
 */

import { useEffect, useRef, useCallback } from 'react';
import { loginFullWithGoogle } from '@/lib/api';
import { Button } from '@/components/ui/button';

/** ID for Google Identity Services script tag */
const SCRIPT_ID = 'google-identity-services';

/** Gmail API scopes required for email operations */
const GMAIL_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

interface Props {
  /** Callback when authentication succeeds */
  onSuccess: (data: any) => void;
  /** Disables the button */
  disabled?: boolean;
}

/**
 * Dynamically loads Google Identity Services script
 * @returns Promise that resolves when script is loaded
 */
function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();

    const existing = document.getElementById(
      SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load GSI scripts')),
        {
          once: true,
        }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GSI script'));
    document.head.appendChild(script);
  });
}

/**
 * Google "G" logo SVG component
 * Official Google brand colors
 */
function GoogleLogo() {
  return (
    <svg
      className='h-5 w-5'
      viewBox='0 0 48 48'
      aria-hidden='true'
    >
      <path
        fill='#EA4335'
        d='M24 9.5c3.54 0 6 1.54 7.38 2.84l5.4-5.4C33.64 3.36 29.3 1.5 24 1.5 14.88 1.5 7.09 6.98 3.64 14.63l6.59 5.12C11.85 13.61 17.45 9.5 24 9.5z'
      />
      <path
        fill='#4285F4'
        d='M46.5 24.5c0-1.57-.14-3.08-.4-4.5H24v9h12.7c-.55 2.97-2.23 5.49-4.73 7.18l7.41 5.75C43.96 37.74 46.5 31.62 46.5 24.5z'
      />
      <path
        fill='#FBBC05'
        d='M10.23 28.25A14.5 14.5 0 0 1 9.5 24c0-1.49.25-2.93.7-4.25l-6.59-5.12A22.43 22.43 0 0 0 1.5 24c0 3.62.87 7.04 2.41 10.06l6.32-5.81z'
      />
      <path
        fill='#34A853'
        d='M24 46.5c6.3 0 11.6-2.08 15.47-5.64l-7.41-5.75C30.12 36.9 27.3 38 24 38c-6.55 0-12.05-4.11-14.07-9.75l-6.32 5.81C7.09 41.02 14.88 46.5 24 46.5z'
      />
    </svg>
  );
}

/**
 * Google Sign-In button component
 * Initializes OAuth2 client and handles authentication flow
 */
export function GoogleSigninButton({ onSuccess, disabled }: Props) {
  // Reference to OAuth2 code client instance
  const codeClientRef = useRef<google.accounts.oauth2.CodeClient | null>(null);

  /**
   * Initializes Google OAuth2 code client
   * Configures client with scopes, callback, and options
   */
  const initClient = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('Missing VITE_GOOGLE_CLIENT_ID');
      return;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      console.error('Google OAuth2 not available on window.google');
      return;
    }

    codeClientRef.current = oauth2.initCodeClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      ux_mode: 'popup',
      access_type: 'offline',
      prompt: 'consent',
      callback: async (resp) => {
        try {
          if (!resp.code) {
            console.error('No authorization code returned', resp.error);
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

  /**
   * Load GSI script and initialize client on mount
   * Cleanup on unmount to prevent memory leaks
   */
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

  /**
   * Triggers OAuth2 authorization flow
   * Opens popup for user to sign in with Google
   */
  const handleClick = () => {
    if (!codeClientRef.current) {
      console.warn('Code client not initialized yet');
      return;
    }
    codeClientRef.current.requestCode();
  };

  return (
    <Button
      type='button'
      onClick={handleClick}
      disabled={disabled}
      className='w-full justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-[#3c4043] shadow-sm hover:bg-[#f7f8f8] active:bg-[#f1f3f4]'
      variant='outline'
      aria-label='Sign in with Google'
    >
      <GoogleLogo />
      <span className='whitespace-nowrap'>Sign in with Google</span>
    </Button>
  );
}
