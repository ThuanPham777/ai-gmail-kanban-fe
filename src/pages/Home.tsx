import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  User,
  LogOut,
  Shield,
  Home as HomeIcon,
  LogIn,
  UserPlus,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
      <nav className='bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800'>
        <div className='container mx-auto px-4'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center gap-2'>
              <HomeIcon className='h-6 w-6 text-primary' />
              <h1 className='text-xl font-bold'>Secure Inbox</h1>
            </div>
            <div className='flex items-center gap-4'>
              {user ? (
                <>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='gap-2'
                    onClick={() => navigate('/inbox')}
                  >
                    <Inbox className='h-4 w-4' />
                    Go to Inbox
                  </Button>
                  <div
                    className='relative'
                    ref={userMenuRef}
                  >
                    <button
                      type='button'
                      onClick={() => setIsUserMenuOpen((o) => !o)}
                      className='h-9 w-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary'
                      aria-label='User menu'
                    >
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.email
                        )}&background=random&size=64`}
                        alt='User avatar'
                        className='h-full w-full object-cover'
                      />
                    </button>

                    {isUserMenuOpen && (
                      <div className='absolute right-0 mt-2 w-64 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-4 z-50'>
                        <div className='flex items-center gap-3'>
                          <div className='h-10 w-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700'>
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.email
                              )}&background=random&size=64`}
                              alt='User avatar'
                              className='h-full w-full object-cover'
                            />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-semibold truncate'>
                              {user.email}
                            </p>
                            <p className='text-[11px] text-muted-foreground truncate'>
                              ID: {user._id}
                            </p>
                          </div>
                        </div>
                        <div className='mt-3'>
                          <Button
                            onClick={handleLogout}
                            variant='outline'
                            size='sm'
                            className='w-full justify-start gap-2'
                          >
                            <LogOut className='h-4 w-4' />
                            Logout
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to='/login'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='gap-2'
                    >
                      <LogIn className='h-4 w-4' />
                      Login
                    </Button>
                  </Link>
                  <Link to='/signup'>
                    <Button
                      size='sm'
                      className='gap-2'
                    >
                      <UserPlus className='h-4 w-4' />
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className='container mx-auto px-4 py-16'>
        <div className='text-center mb-12'>
          <p className='text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3'>
            Secure email sandbox
          </p>
          <h2 className='text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent'>
            {user
              ? `Welcome back, ${user.email.split('@')[0]}!`
              : 'Authenticate. Refresh. Collaborate.'}
          </h2>
          <p className='text-lg text-muted-foreground max-w-3xl mx-auto'>
            End-to-end token handling, Google Sign-In, and a polished tri-pane
            inbox mockup. Everything you need to demonstrate a production-ready
            auth flow.
          </p>
          {!user && (
            <div className='mt-6 flex flex-wrap justify-center gap-4'>
              <Button
                size='lg'
                className='gap-2'
                onClick={() => navigate('/login')}
              >
                Get Started <ArrowRight className='h-4 w-4' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                onClick={() => navigate('/signup')}
              >
                Create account
              </Button>
            </div>
          )}
        </div>

        {user ? (
          <>
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'>
              <Card className='border-primary/40 shadow-lg hover:shadow-xl transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <User className='h-5 w-5 text-primary' />
                    <CardTitle>User Profile</CardTitle>
                  </div>
                  <CardDescription>Active session</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <div>
                    <p className='text-sm text-muted-foreground'>Email</p>
                    <p className='text-base font-semibold'>{user.email}</p>
                  </div>
                  <div>
                    <p className='text-sm text-muted-foreground'>Provider</p>
                    <p className='text-sm capitalize'>
                      {user.provider ?? 'password'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='border-green-500/40 shadow-lg hover:shadow-xl transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Shield className='h-5 w-5 text-green-600' />
                    <CardTitle>Token Health</CardTitle>
                  </div>
                  <CardDescription>Auto refresh enabled</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    Access tokens live in-memory; refresh tokens stay in
                    hardened storage. Automatic rotation covers expiry +
                    concurrency.
                  </p>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => navigate('/inbox')}
                  >
                    View inbox
                  </Button>
                </CardContent>
              </Card>

              <Card className='border-blue-500/40 shadow-lg hover:shadow-xl transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Inbox className='h-5 w-5 text-blue-600' />
                    <CardTitle>Email Dashboard</CardTitle>
                  </div>
                  <CardDescription>Three-column workspace</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    Browse folders, paginate messages, preview details, and
                    interact with mocked attachments and actions.
                  </p>
                  <Button
                    size='sm'
                    className='gap-2'
                    onClick={() => navigate('/inbox')}
                  >
                    Open dashboard <ArrowRight className='h-4 w-4' />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div className='grid gap-6 md:grid-cols-2 max-w-4xl mx-auto mb-12'>
              <Link to='/login'>
                <Card className='border-blue-500/50 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full'>
                  <CardHeader>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 rounded-lg bg-blue-500/10'>
                        <LogIn className='h-6 w-6 text-blue-600' />
                      </div>
                      <div>
                        <CardTitle>Sign In</CardTitle>
                        <CardDescription>
                          Already have an account?
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Access protected inbox routes, trigger refresh tokens, and
                      explore the post-login workspace.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to='/signup'>
                <Card className='border-green-500/50 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full'>
                  <CardHeader>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 rounded-lg bg-green-500/10'>
                        <UserPlus className='h-6 w-6 text-green-600' />
                      </div>
                      <div>
                        <CardTitle>Sign Up</CardTitle>
                        <CardDescription>Create a new account</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Register with validation, then hop into the secure inbox.
                      Google Sign-In is supported on login.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className='grid gap-6 md:grid-cols-3 max-w-6xl mx-auto'>
              <Card className='shadow-md hover:shadow-lg transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Shield className='h-5 w-5 text-purple-600' />
                    <CardTitle>Security-first</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Short-lived access tokens + rotating refresh tokens with
                    forced logout when anything goes stale.
                  </p>
                </CardContent>
              </Card>

              <Card className='shadow-md hover:shadow-lg transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Inbox className='h-5 w-5 text-blue-600' />
                    <CardTitle>Mock API</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Fully mocked folders, email list pagination, and detailed
                    message bodies with attachments.
                  </p>
                </CardContent>
              </Card>

              <Card className='shadow-md hover:shadow-lg transition-shadow'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <User className='h-5 w-5 text-green-600' />
                    <CardTitle>Responsive UX</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>
                    Desktop tri-pane layout collapses gracefully on mobile with
                    keyboard-friendly navigation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
