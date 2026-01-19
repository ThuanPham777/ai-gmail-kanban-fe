import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setAccessToken, persistLoginInfo } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ShieldCheck, Home as HomeIcon, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleSigninButton } from '@/components/auth/GoogleSignInButton';
import type { LoginResponse } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [error, setError] = useState<string>('');
  // Track if we should navigate after user state is committed
  const shouldNavigateRef = useRef(false);

  /**
   * Navigate to inbox once user state is committed
   * This prevents race condition where navigate happens before React commits the state
   */
  useEffect(() => {
    if (shouldNavigateRef.current && user) {
      shouldNavigateRef.current = false;
      navigate('/inbox', { replace: true });
    }
  }, [user, navigate]);

  /**
   * Handle successful Google OAuth login/registration
   * - Sets access token in memory
   * - Persists user data (refresh token is in HttpOnly cookie)
   * - Sets user state and flags for navigation
   */
  const handleGoogleSuccess = (response: LoginResponse) => {
    setError('');
    // IMPORTANT: Set navigation flag FIRST before any state changes
    // persistLoginInfo triggers storage events that can sync user state
    // before this flag is set, causing navigation to be skipped
    shouldNavigateRef.current = true;
    setAccessToken(response.data.accessToken);
    // Refresh token is now in HttpOnly cookie - only persist user info
    persistLoginInfo(response.data.user, response.data.accessToken);
    setUser(response.data.user);
  };

  /**
   * Handle Google OAuth errors
   */
  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <div className='min-h-screen min-h-screen-mobile flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8 py-8 safe-area-inset-top safe-area-inset-bottom'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center px-4 sm:px-6'>
          <div className='flex items-center justify-between mb-4'>
            <Link
              to='/'
              className='text-muted-foreground hover:text-foreground transition-colors tap-target'
              aria-label='Go to home'
            >
              <HomeIcon className='h-5 w-5' />
            </Link>
            <CardTitle className='text-2xl sm:text-3xl font-bold flex-1 text-center'>
              Welcome
            </CardTitle>
            <div className='w-5' />
          </div>
          <CardDescription className='text-sm sm:text-base'>
            Sign in with your Google account to access your inbox
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6 px-4 sm:px-6'>
          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-4'>
            <div className='flex items-center gap-3 rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-left text-sm text-blue-700 dark:text-blue-300'>
              <Mail className='h-5 w-5 shrink-0' />
              <p>
                Sign in with Google to grant Gmail access and manage your emails
                with AI-powered features.
              </p>
            </div>

            <GoogleSigninButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              buttonText='Continue with Google'
            />
          </div>

          <div className='flex items-center gap-3 rounded-md bg-muted/40 p-3 text-left text-sm text-muted-foreground'>
            <ShieldCheck className='h-4 w-4 text-primary shrink-0' />
            <p>
              Access tokens stay in-memory. Refresh tokens are stored in secure
              HttpOnly cookies for maximum security.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
