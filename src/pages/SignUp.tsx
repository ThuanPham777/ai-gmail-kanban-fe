import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { registerUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Home as HomeIcon,
} from 'lucide-react';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
});

type SignUpFormData = z.infer<typeof signupSchema>;

export default function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signupSchema),
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setSuccess('Registration successful! Redirecting to login…');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
    },
  });

  const onSubmit = (data: SignUpFormData) => {
    setError('');
    setSuccess('');
    mutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <div className='flex items-center justify-between mb-4'>
            <Link
              to='/'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              <HomeIcon className='h-5 w-5' />
            </Link>
            <CardTitle className='text-3xl font-bold flex-1 text-center'>
              Create an Account
            </CardTitle>
            <div className='w-5' />
          </div>
          <CardDescription>
            Create your account with email + password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='space-y-4'
          >
            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant='success'>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  id='email'
                  type='email'
                  autoComplete='email'
                  placeholder='name@example.com'
                  className='pl-10'
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className='text-sm text-destructive'>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  id='password'
                  type='password'
                  autoComplete='new-password'
                  placeholder='Create a secure password'
                  className='pl-10'
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className='text-sm text-destructive'>
                  {errors.password.message}
                </p>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Use at least 8 characters, including a capital letter and a
                  number.
                </p>
              )}
            </div>

            <Button
              type='submit'
              className='w-full'
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className='flex flex-col space-y-4'>
          <div className='text-sm text-center text-muted-foreground'>
            Already have an account?{' '}
            <Link
              to='/login'
              className='text-primary hover:underline font-medium'
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
