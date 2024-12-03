// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { FirebaseProvider } from '@/contexts/FirebaseContext';

export const metadata: Metadata = {
  title: "Stage Cue App",
  description: "A stage cue management application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  )
}