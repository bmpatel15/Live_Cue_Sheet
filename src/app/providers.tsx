"use client"

import { FirebaseProvider } from '@/contexts/FirebaseContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
} 