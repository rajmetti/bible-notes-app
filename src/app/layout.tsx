'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { initBibleData } from '../lib/db';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import './globals.css';
import { ThemeProvider } from '@/app/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log('RootLayout useEffect: Initializing Bible data...');
    const initialize = async () => {
      try {
        await initBibleData();
      } catch (error) {
        console.error('RootLayout failed to initialize data:', error);
        setInitError('Failed to load Bible data. Please check your network or asv.json file.');
      }
    };
    initialize();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* <nav className="p-4 bg-slate-800 text-white">
          <Link href="/bible" className="mr-4 hover:underline">Bible</Link>
          <Link href="/bible/notes" className="hover:underline">Notes</Link>
        </nav> */}
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
          
        {initError && (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {initError}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}