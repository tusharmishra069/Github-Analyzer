'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth context to load

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // If a specific role is required, check it
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to appropriate dashboard based on user's actual role
      if (user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/user/dashboard');
      }
      return;
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

  // If role check failed, don't render children (component will redirect)
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
