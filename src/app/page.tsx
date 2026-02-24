'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Stars
} from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden noise">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div 
          className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 270), oklch(0.55 0.22 300))' }}
        />
        <div 
          className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 200), oklch(0.45 0.2 270))' }}
        />
        <div 
          className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full opacity-15 blur-[80px]"
          style={{ background: 'linear-gradient(135deg, oklch(0.75 0.15 70), oklch(0.65 0.18 50))' }}
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 dot-pattern opacity-40" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="glass border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium group-hover:shadow-lg transition-shadow">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Optimism Engine
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">
                    Think clearly. Train wisely.
                  </p>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Dark mode toggle */}
                <button
                  onClick={toggleDark}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
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

                {isSignedIn ? (
                  <div className="flex items-center gap-3">
                    <Link 
                      href="/reflect"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dashboard
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-premium hover:shadow-lg btn-hover-lift">
                        Get Started
                      </button>
                    </SignUpButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border/50 mb-8"
            >
              <Stars className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-secondary-foreground">
                AI-powered emotional intelligence
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-display mb-6"
            >
              <span className="text-foreground">Understand Your MInd.</span>
              <br />
              <span className="gradient-text">Before It Understands You.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
            >
              Train your thoughts, catch cognitive distortions, and build mental clarity 
              with AI-powered self-reflection.
            </motion.p>

            {/* Secondary text */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-muted-foreground/80 max-w-lg mx-auto"
            >
              Whether you're processing a difficult emotion or training your mind - 
              we'll help you see things clearly.
            </motion.p>
          </div>
        </section>

        {/* Mode Selection */}
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8"
            >
              Where do you want to start?
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6">
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
                  <div className="relative glass rounded-2xl border border-border/50 p-8 shadow-premium hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0">
                        <Heart className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">Reflect</h3>
                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-muted-foreground mb-4">
                          <span className="font-medium text-foreground">From me.</span> I'm feeling something and want to understand it better.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            Journaling
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Reframing
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Self-reflection
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
                  <div className="relative glass rounded-2xl border border-border/50 p-8 shadow-premium hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0">
                        <Sparkles className="w-7 h-7 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">The Lab</h3>
                          <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-muted-foreground mb-4">
                          <span className="font-medium text-foreground">Train your mind.</span> Quick tools, practice exercises, and cognitive goals.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-3 py-1 rounded-full bg-accent/10 text-accent font-medium">
                            Quick Tools
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Practice
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                            Goals
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

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                One engine. Two perspectives.
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                The same AI analyzes both — but adapts its response to who needs clarity.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="glass rounded-2xl border border-border/50 p-8 shadow-premium"
            >
              <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Deep Analysis</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detects cognitive patterns, emotional undertones, and unspoken meaning beneath the words.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Instant Clarity</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get actionable insights in seconds. Know what to do and what to avoid.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-secondary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Privacy First</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your messages stay yours. Processed privately, never stored or shared.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium"
                      style={{
                        background: `linear-gradient(135deg, 
                          ${i % 2 === 0 ? 'oklch(0.45 0.2 270)' : 'oklch(0.55 0.18 200)'}, 
                          ${i % 2 === 0 ? 'oklch(0.55 0.22 300)' : 'oklch(0.45 0.2 270)'})`,
                        color: 'white',
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 text-accent fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs">Early testers love it</span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <span className="text-muted-foreground/80">
                Now available for public beta
              </span>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="glass rounded-3xl border border-border/50 p-10 shadow-premium relative overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              
              <div className="relative">
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  Ready to think clearly?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Start your first reflection in under 30 seconds.
                </p>
                <Link 
                  href={isSignedIn ? "/reflect" : "#"}
                  onClick={(e) => !isSignedIn && e.preventDefault()}
                >
                  {isSignedIn ? (
                    <button className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-premium hover:shadow-lg btn-hover-lift glow-primary inline-flex items-center gap-2">
                      Start Reflecting
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <SignUpButton mode="modal">
                      <button className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-premium hover:shadow-lg btn-hover-lift glow-primary inline-flex items-center gap-2">
                        Get Started Free
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </SignUpButton>
                  )}
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Privacy-first</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span>No data stored</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span>Built with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
