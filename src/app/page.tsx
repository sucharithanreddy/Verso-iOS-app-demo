'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Heart, 
  ArrowRight, 
  Moon, 
  Sun,
  Zap,
  Shield,
  Brain,
  ChevronRight,
  Stars,
  User,
} from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNav } from '@/components/MobileNav';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle dark mode toggle
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Record user activity when signed in (for streak calculation)
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/activity', { method: 'POST' }).catch(console.error);
    }
  }, [isSignedIn]);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDark);
  };

  if (!isLoaded || !mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
            <div className="absolute inset-2 rounded-xl bg-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-4 rounded-lg bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    );
  }

  // ========== UNAUTHENTICATED VIEW ==========
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px]"
            style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 270), oklch(0.55 0.22 300))' }}
          />
          <div 
            className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px]"
            style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 200), oklch(0.45 0.2 270))' }}
          />
          <div className="absolute inset-0 dot-pattern opacity-40" />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="fixed top-4 right-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center glass border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl overflow-hidden shadow-premium">
              <Image
                src="/logo.png"
                alt="Verso Logo"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
              Verso
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Think clearly. Train wisely.
            </p>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border/50 mb-8"
          >
            <Stars className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-secondary-foreground">
              AI-powered emotional intelligence
            </span>
          </motion.div>

          {/* Value Prop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center max-w-md mb-10"
          >
            <p className="text-lg md:text-xl text-foreground mb-2">
              Understand Your Mind.
            </p>
            <p className="text-base md:text-lg gradient-text font-medium">
              Before It Understands You.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Train your thoughts, catch cognitive distortions, and build mental clarity with AI-powered self-reflection.
            </p>
          </motion.div>

          {/* Auth Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
          >
            <SignInButton mode="modal">
              <button className="flex-1 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-premium flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="flex-1 px-6 py-3.5 glass border border-border/50 text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </motion.div>

          {/* Features preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 grid grid-cols-3 gap-6 max-w-md"
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Deep Analysis</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground">Instant Clarity</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 text-secondary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Privacy First</p>
            </div>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-auto pt-12 text-xs text-muted-foreground/60 text-center"
          >
            Not a replacement for professional help. If in crisis, call 988 (US).
          </motion.p>
        </main>
      </div>
    );
  }

  // ========== AUTHENTICATED VIEW ==========
  return (
    <div className="min-h-screen bg-background relative overflow-hidden noise">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 270), oklch(0.55 0.22 300))' }}
        />
        <div 
          className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 200), oklch(0.45 0.2 270))' }}
        />
        <div className="absolute inset-0 dot-pattern opacity-40" />
      </div>

      {/* Mobile Header */}
      <MobileHeader 
        title="Verso"
        subtitle="Think clearly. Train wisely."
        icon="sparkles"
        onToggleDark={toggleDark}
        isDark={isDark}
        rightAction={<UserButton afterSignOutUrl="/" />}
      />

      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hide-on-mobile">
        <div className="glass border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-premium">
                  <Image
                    src="/logo.png"
                    alt="Verso Logo"
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Verso
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">
                    Think clearly. Train wisely.
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleDark}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Link 
                  href="/reflect"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-mobile">
        {/* Hero Section */}
        <section className="pt-10 md:pt-20 pb-8 md:pb-16 px-4 md:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-secondary/80 border border-border/50 mb-6 md:mb-8"
            >
              <Stars className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
              <span className="text-xs md:text-sm font-medium text-secondary-foreground">
                AI-powered emotional intelligence
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-display mb-4 md:mb-6 px-2"
            >
              <span className="text-foreground">Understand Your Mind.</span>
              <br />
              <span className="gradient-text">Before It Understands You.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-3 md:mb-4 px-4"
            >
              Train your thoughts, catch cognitive distortions, and build mental clarity 
              with AI-powered self-reflection.
            </motion.p>
          </div>
        </section>

        {/* Mode Selection */}
        <section className="py-6 md:py-12 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6 md:mb-8"
            >
              Where do you want to start?
            </motion.p>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Reflect Card */}
              <Link href="/reflect">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ y: -4 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <div className="relative glass rounded-2xl border border-border/50 p-5 md:p-8 shadow-premium hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]">
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0">
                        <Heart className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                          <h3 className="text-lg md:text-xl font-semibold text-foreground">Reflect</h3>
                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                          <span className="font-medium text-foreground">From me.</span> I&apos;m feeling something and want to understand it better.
                        </p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          <span className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-primary/10 text-primary font-medium">
                            Journaling
                          </span>
                          <span className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Reframing
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>

              {/* The Lab Card */}
              <Link href="/lab">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  whileHover={{ y: -4 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <div className="relative glass rounded-2xl border border-border/50 p-5 md:p-8 shadow-premium hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]">
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0">
                        <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                          <h3 className="text-lg md:text-xl font-semibold text-foreground">The Lab</h3>
                          <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                          <span className="font-medium text-foreground">Train your mind.</span> Quick tools, practice exercises, and cognitive goals.
                        </p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          <span className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-accent/10 text-accent font-medium">
                            Quick Tools
                          </span>
                          <span className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Practice
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="py-6 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link href="/progress" className="flex-1 max-w-xs mx-auto sm:mx-0">
                <div className="glass rounded-xl border border-border/50 p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">View Progress</p>
                    <p className="text-xs text-muted-foreground">Track your journey</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer note */}
        <div className="py-8 px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.
          </p>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Only for authenticated users */}
      <MobileNav />
    </div>
  );
}
