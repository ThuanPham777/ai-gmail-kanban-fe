import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loginUser, loginWithGoogle } from '@/lib/api';
import { setAccessToken, persistRefreshInfo } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, ShieldCheck, Home as HomeIcon } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/context/AuthContext';

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number');

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [error, setError] = useState<string>('');
    const [oauthError, setOauthError] = useState<string>('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const handleSuccess = (data: Awaited<ReturnType<typeof loginUser>>) => {
        setAccessToken(data.accessToken);
        persistRefreshInfo(data.user, data.refreshToken);
        setUser(data.user);
        navigate('/inbox', { replace: true });
    };

    const passwordMutation = useMutation({
        mutationFn: loginUser,
        onSuccess: handleSuccess,
        onError: (err: any) => {
            const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
            setError(errorMessage);
        },
    });

    const googleMutation = useMutation({
        mutationFn: loginWithGoogle,
        onSuccess: handleSuccess,
        onError: (err: any) => {
            const errorMessage = err.response?.data?.message || 'Google Sign-In failed. Please try again.';
            setOauthError(errorMessage);
        },
    });

    const handleGoogleCredential = (credential: string) => {
        setOauthError('');
        googleMutation.mutate(credential);
    };
    const onSubmit = (data: LoginFormData) => {
        setError('');
        passwordMutation.mutate(data);
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex items-center justify-between mb-4">
                        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                            <HomeIcon className="h-5 w-5" />
                        </Link>
                        <CardTitle className="text-3xl font-bold flex-1 text-center">Welcome Back</CardTitle>
                        <div className="w-5" />
                    </div>
                    <CardDescription>Authenticate with email + password or Google</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    className="pl-10"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                    {...register('password')}
                                />
                            </div>
                            {errors.password ? (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Use at least 8 characters with one uppercase letter and one number.
                                </p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>
                            {passwordMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    {oauthError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{oauthError}</AlertDescription>
                        </Alert>
                    )}

                    <GoogleSignInButton
                        onCredential={handleGoogleCredential}
                        disabled={passwordMutation.isPending}
                        isLoading={googleMutation.isPending}
                    />

                    <div className="flex items-center gap-3 rounded-md bg-muted/40 p-3 text-left text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <p>
                            Access tokens stay in-memory and refresh tokens live in secure storage for safer sessions.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-sm text-center text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link to="/signup" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
