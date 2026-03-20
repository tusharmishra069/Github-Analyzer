'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GithubOAuthCallbackRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/auth/callback?provider=github&error=${encodeURIComponent(error)}`);
      return;
    }

    if (code) {
      router.replace(`/auth/callback?provider=github&code=${encodeURIComponent(code)}`);
      return;
    }

    router.replace('/auth/login');
  }, [router, searchParams]);

  return null;
}
