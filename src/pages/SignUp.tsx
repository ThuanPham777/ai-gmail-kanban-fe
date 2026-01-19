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
import {
  AlertCircle,
  CheckCircle,
  Home as HomeIcon,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleSigninButton } from '@/components/auth/GoogleSignInButton';
import type { LoginResponse } from '@/lib/api';

export default function SignUp() {
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
   * Handle successful Google OAuth registration/login
   * Google OAuth handles both - new users are registered, existing users are logged in
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
    <div className='min-h-screen min-h-screen-mobile flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8 py-8 safe-area-inset-top safe-area-inset-bottom'>
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
              Get Started
            </CardTitle>
            <div className='w-5' />
          </div>
          <CardDescription className='text-sm sm:text-base'>
            Create your account with Google to start managing your inbox
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
            <div className='flex items-center gap-3 rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-left text-sm text-green-700 dark:text-green-300'>
              <CheckCircle className='h-5 w-5 shrink-0' />
              <p>
                Sign up instantly with your Google account. We'll request Gmail
                access to help you manage your emails.
              </p>
            </div>

            <div className='flex items-center gap-3 rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-left text-sm text-blue-700 dark:text-blue-300'>
              <Mail className='h-5 w-5 shrink-0' />
              <p>
                Your Gmail data stays secure. We only access what's needed for
                email management features.
              </p>
            </div>

            <GoogleSigninButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              buttonText='Sign up with Google'
            />
          </div>

          <div className='flex items-center gap-3 rounded-md bg-muted/40 p-3 text-left text-sm text-muted-foreground'>
            <ShieldCheck className='h-4 w-4 text-primary shrink-0' />
            <p>
              Your security is our priority. All tokens are stored securely and
              sessions are protected.
            </p>
          </div>

          <div className='text-sm text-center text-muted-foreground'>
            Already have an account?{' '}
            <Link
              to='/login'
              className='text-primary hover:underline font-medium'
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
