'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Heart, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

const tabs = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Reflect', href: '/reflect', icon: Heart },
  { name: 'Lab', href: '/lab', icon: Sparkles },
  { name: 'Profile', href: '/profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useUser();

  // Don't show navigation for unauthenticated users
  if (!isSignedIn) {
    return null;
  }

  const handleTabClick = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Safe area for iOS home indicator */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== '/' && pathname.startsWith(tab.href));
            
            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab.href)}
                className={cn(
                  'relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-1 w-8 h-1 rounded-full bg-primary"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                
                <tab.icon 
                  className={cn(
                    'w-5 h-5 transition-transform',
                    isActive && 'scale-110'
                  )} 
                />
                <span className={cn(
                  'text-[10px] font-medium mt-1',
                  isActive && 'font-semibold'
                )}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
