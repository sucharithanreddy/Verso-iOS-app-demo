'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Sparkles, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    // Debug: Log platform info
    console.log('[PWA] Platform check:', {
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      navigatorStandalone: (window.navigator as any).standalone,
    });

    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired!', e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (don't spam immediately)
      setTimeout(() => {
        // Check if user hasn't dismissed before
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        console.log('[PWA] Dismissed?', dismissed);
        if (!dismissed) {
          console.log('[PWA] Showing install prompt');
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
          console.log('[PWA] Showing iOS install prompt');
          setShowPrompt(true);
        }, 10000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    console.log('[PWA] Install button clicked, deferredPrompt:', !!deferredPrompt);
    
    if (deferredPrompt) {
      console.log('[PWA] Calling prompt()...');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] Install outcome:', outcome);
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS - show instructions
      console.log('[PWA] iOS - instructions shown');
      setShowPrompt(false);
    } else {
      console.log('[PWA] No deferred prompt available - browser may handle install differently');
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    console.log('[PWA] Dismiss clicked');
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 px-4 md:pb-6 md:justify-end"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop - clicking it dismisses */}
          <div 
            className="absolute inset-0 bg-black/20"
            onClick={handleDismiss}
            style={{ touchAction: 'manipulation' }}
          />
          
          <div 
            className="relative w-full max-w-sm bg-card rounded-2xl border border-border/50 p-4 shadow-lg"
            style={{ 
              touchAction: 'manipulation',
              WebkitTransform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Install App</h3>
                  <button
                    onClick={handleDismiss}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleDismiss();
                    }}
                    className="p-2 -m-2 rounded-lg active:bg-secondary/80 text-muted-foreground transition-colors"
                    style={{ touchAction: 'manipulation', minWidth: '44px', minHeight: '44px' }}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Add Optimism Engine to your home screen for quick access
                </p>
              </div>
            </div>

            {/* iOS Instructions or Install Button */}
            {isIOS ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 text-sm">
                  <span className="text-muted-foreground">1.</span>
                  <span>Tap the</span>
                  <Share className="w-5 h-5 mx-1 text-primary" />
                  <span className="font-medium">Share button</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 text-sm">
                  <span className="text-muted-foreground">2.</span>
                  <span>Scroll down and tap</span>
                  <span className="font-medium mx-1">&quot;Add to Home Screen&quot;</span>
                </div>
                <button
                  onClick={handleDismiss}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleDismiss();
                  }}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium active:opacity-80 transition-opacity"
                  style={{ touchAction: 'manipulation' }}
                >
                  Got it!
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleDismiss();
                  }}
                  className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-medium active:opacity-80 transition-opacity"
                  style={{ touchAction: 'manipulation' }}
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleInstall();
                  }}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
