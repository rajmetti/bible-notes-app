import { useEffect } from 'react';
import { initBibleData } from '../../lib/db';
import '../styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initBibleData().catch(console.error);
  }, []);

  return <Component {...pageProps} />;
}