'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasHandled = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasHandled.current) {
        return;
      }
      hasHandled.current = true;

      try {
        const code = searchParams.get('code');
        const provider = searchParams.get('provider');

        if (!code || !provider) {
          throw new Error('Missing code or provider');
        }

        const endpoint = provider === 'google' 
          ? '/api/auth/oauth/google/callback'
          : '/api/auth/oauth/github/callback';

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) throw new Error('Authentication failed');

        const data = await response.json();

        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to user dashboard
        router.push('/user/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return null;
}
