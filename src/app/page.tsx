'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!profile?.profile_completed) {
      router.replace('/onboarding');
      return;
    }
    router.replace('/today');
  }, [user, profile, loading, router]);

  return (
    <div className="phone-frame items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
    </div>
  );
}
