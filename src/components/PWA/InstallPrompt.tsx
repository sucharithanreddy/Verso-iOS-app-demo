'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after delay if not installed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowPrompt(false);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  // Don't show if already installed
  if (isStandalone || !showPrompt) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 px-4"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={handleDismiss}
        style={{ touchAction: 'manipulation' }}
      />
      
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-2xl"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Install App</h3>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-2 -m-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                style={{ minWidth: '44px', minHeight: '44px', touchAction: 'manipulation' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add Optimism Engine to your home screen
            </p>
          </div>
        </div>

        {/* iOS Instructions or Install Button */}
        {isIOS ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200">
              <span className="text-gray-500">1.</span>
              <span>Tap the</span>
              <Share className="w-5 h-5 text-cyan-500" />
              <span className="font-medium">Share button</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200">
              <span className="text-gray-500">2.</span>
              <span>Tap</span>
              <span className="font-medium text-cyan-600 dark:text-cyan-400">&quot;Add to Home Screen&quot;</span>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors active:bg-cyan-700"
              style={{ touchAction: 'manipulation', minHeight: '48px' }}
            >
              Got it!
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400"
              style={{ touchAction: 'manipulation', minHeight: '48px' }}
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium flex items-center justify-center gap-2 transition-colors active:bg-cyan-700"
              style={{ touchAction: 'manipulation', minHeight: '48px' }}
            >
              <Download className="w-4 h-4" />
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
