import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { Loader2 } from 'lucide-react';
import InboxPage from './pages/InboxPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const FullscreenLoader = () => (
  <div className='min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground'>
    <Loader2 className='h-6 w-6 animate-spin' />
    <p className='text-sm font-medium tracking-wide'>Bootstrapping session…</p>
  </div>
);

const ProtectedRoute = ({ element }: { element: React.ReactElement }) => {
  const { user, bootstrapped } = useAuth();
  if (!bootstrapped) return <FullscreenLoader />;
  if (!user)
    return (
      <Navigate
        to='/login'
        replace
      />
    );
  return element;
};

const PublicOnlyRoute = ({ element }: { element: React.ReactElement }) => {
  const { user, bootstrapped } = useAuth();
  if (!bootstrapped) return <FullscreenLoader />;
  return user ? (
    <Navigate
      to='/inbox'
      replace
    />
  ) : (
    element
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path='/'
              element={<Home />}
            />
            <Route
              path='/login'
              element={<PublicOnlyRoute element={<Login />} />}
            />
            <Route
              path='/signup'
              element={<PublicOnlyRoute element={<SignUp />} />}
            />
            <Route
              path='/inbox'
              element={<ProtectedRoute element={<InboxPage />} />}
            />
            <Route
              path='*'
              element={
                <Navigate
                  to='/'
                  replace
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
