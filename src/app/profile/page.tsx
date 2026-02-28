'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Moon, 
  Sun, 
  TrendingUp, 
  Calendar, 
  Flame,
  Sparkles,
  ChevronRight,
  History,
  MessageSquare,
  Target,
} from 'lucide-react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNav } from '@/components/MobileNav';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string | null;
  summary: string | null;
  coreBelief: string | null;
  currentLayer: string;
  isCompleted: boolean;
  createdAt: string;
  messages: Array<{ id: string; role: string; content: string }>;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchSessions();
    }
  }, [isSignedIn]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sessions', { cache: 'no-store' });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDark);
  };

  // Calculate real stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.isCompleted).length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0);
  
  // Calculate streak
  const today = new Date();
  let streakDays = 0;
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const hasSession = sessions.some(s => {
      const sessionDate = new Date(s.createdAt);
      return sessionDate.toDateString() === checkDate.toDateString();
    });
    if (hasSession) streakDays++;
    else if (i > 0) break;
  }

  const stats = [
    { label: 'Sessions', value: totalSessions, icon: Calendar },
    { label: 'Streak', value: `${streakDays}d`, icon: Flame },
    { label: 'Messages', value: totalMessages, icon: MessageSquare },
  ];

  // Get recent sessions (last 5)
  const recentSessions = sessions.slice(0, 5);
  const displaySessions = showAllHistory ? sessions : recentSessions;

  if (!isLoaded || !mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
          <div className="absolute inset-2 rounded-xl bg-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="absolute inset-4 rounded-lg bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden noise pb-mobile">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 270), oklch(0.55 0.22 300))' }}
        />
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      {/* Mobile Header */}
      <MobileHeader
        title="Profile"
        icon="sparkles"
        onToggleDark={toggleDark}
        isDark={isDark}
      />

      <main className="relative z-10 px-4 py-6 space-y-6">
        {!isSignedIn ? (
          /* Not signed in state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium mb-6">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Sign in to track progress
            </h2>
            <p className="text-muted-foreground text-center max-w-xs mb-6">
              Save your sessions, track your streak, and see your cognitive growth over time.
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-premium">
                Sign In
              </button>
            </SignInButton>
          </motion.div>
        ) : (
          /* Signed in state */
          <>
            {/* User Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl border border-border/50 p-6 shadow-premium"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium">
                  {user.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.firstName || 'User'} 
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass rounded-xl border border-border/50 p-4 text-center"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">
                    {loading ? '...' : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Session History Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Session History</h3>
                </div>
                {sessions.length > 5 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    {showAllHistory ? 'Show Less' : `See All (${sessions.length})`}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="glass rounded-xl border border-border/50 p-6 text-center">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 animate-pulse mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="glass rounded-xl border border-border/50 p-6 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Start a reflection to see your history
                  </p>
                  <Link href="/reflect">
                    <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
                      Start Reflecting
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {displaySessions.map((session) => (
                    <Link key={session.id} href={`/reflect?session=${session.id}`}>
                      <div className="glass rounded-xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.title || 'Untitled Session'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(session.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })} • {session.messages?.length || 0} messages
                            </p>
                            {session.coreBelief && (
                              <p className="text-xs text-primary mt-1 truncate">
                                Core belief: {session.coreBelief}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {session.isCompleted && (
                              <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-lg">
                                Complete
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Link href="/progress">
                <div className="glass rounded-xl border border-border/50 p-4 flex items-center justify-between ios-tap cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Progress</p>
                      <p className="text-xs text-muted-foreground">View your journey</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>

              {/* Dark Mode Toggle */}
              <div 
                onClick={toggleDark}
                className="glass rounded-xl border border-border/50 p-4 flex items-center justify-between ios-tap cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    {isDark ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">
                      {isDark ? 'Currently on' : 'Currently off'}
                    </p>
                  </div>
                </div>
                <div className={`
                  w-12 h-7 rounded-full transition-colors relative
                  ${isDark ? 'bg-primary' : 'bg-secondary'}
                `}>
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: isDark ? '26px' : '4px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* App Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center pt-4"
            >
              <p className="text-xs text-muted-foreground">
                Optimism Engine v1.0
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                AI Safety Layer — Anti-Hallucination Architecture
              </p>
            </motion.div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
