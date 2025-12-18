import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Registrar SW (no bloqueante)
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return <Component {...pageProps} />;
}

