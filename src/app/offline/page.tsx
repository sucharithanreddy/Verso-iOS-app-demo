'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto shadow-premium">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>

        {/* Offline Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto">
            <WifiOff className="w-12 h-12 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          You're Offline
        </h1>
        <p className="text-muted-foreground mb-8">
          No worries! Your reflection data is safe. Check your connection and try again.
        </p>

        {/* Status */}
        <div className="mb-8 p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isOnline ? 'Back online!' : 'Still offline'}
            </span>
          </div>
        </div>

        {/* Retry Button */}
        <Button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground shadow-premium glow-primary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>

        {/* Tip */}
        <p className="text-xs text-muted-foreground/60 mt-8">
          💡 Tip: Your sessions are cached and will sync when you're back online
        </p>
      </motion.div>
    </div>
  );
}
