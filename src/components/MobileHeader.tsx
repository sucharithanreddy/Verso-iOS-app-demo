'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  icon?: 'sparkles' | 'heart' | 'lab';
  rightAction?: React.ReactNode;
  onToggleDark?: () => void;
  isDark?: boolean;
}

const iconStyles = {
  sparkles: 'from-primary to-primary/80',
  heart: 'from-rose-500 to-pink-500',
  lab: 'from-accent to-accent/80',
};

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  icon = 'sparkles',
  rightAction,
  onToggleDark,
  isDark = false,
}: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 md:hidden">
      <div className="glass border-b border-border/50">
        {/* iOS Safe Area for notch/status bar */}
        <div className="h-[env(safe-area-inset-top)]" />
        
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left side - Back button or Icon */}
          <div className="flex items-center gap-3 min-w-0">
            {showBack ? (
              <button
                onClick={() => backHref ? router.push(backHref) : router.back()}
                className="p-2 -ml-2 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            ) : (
              <Link href="/" className="flex-shrink-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-premium">
                  <Image
                    src="/logo.png"
                    alt="Verso Logo"
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
            )}
            
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary transition-all"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}
            
            {/* Custom right action (e.g., UserButton) */}
            {rightAction}
          </div>
        </div>
      </div>
    </header>
  );
}
