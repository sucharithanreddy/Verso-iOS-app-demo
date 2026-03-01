'use client';

import { useEffect } from 'react';
import { InstallPrompt } from './InstallPrompt';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('[PWA] Service Worker registered:', registration.scope);
        } catch (error) {
          console.error('[PWA] Service Worker registration failed:', error);
        }
      });
    }
  }, []);

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
