'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Calendar,
  Target,
  Heart,
  Brain,
  Sparkles,
  Award,
  ChevronLeft,
  Moon,
  Sun,
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { MoodTracker } from '@/components/features/MoodTracker';
import { GratitudeJournal } from '@/components/features/GratitudeJournal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Stats {
  totalSessions: number;
  completedSessions: number;
  totalReframes: number;
  totalDistortions: number;
  topDistortions: { type: string; count: number }[];
  topEmotions: { emotion: string; count: number }[];
  averageMood: number;
  moodTrend: 'up' | 'down' | 'stable';
  gratitudeCount: number;
  streakDays: number;
  layerProgress: { layer: string; count: number; percentage: number }[];
  coreBeliefs: string[];
  averageSessionDepth: number;
}

interface MoodEntry {
  id: string;
  mood: number;
  createdAt: string;
}

export default function ProgressPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDark);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const sessionsRes = await fetch('/api/sessions', { cache: 'no-store' });
      const sessionsData = await sessionsRes.json();

      const moodRes = await fetch('/api/mood?days=30', { cache: 'no-store' });
      const moodData = await moodRes.json();
      setMoodHistory(moodData.entries || []);

      const gratitudeRes = await fetch('/api/gratitude?limit=100', { cache: 'no-store' });
      const gratitudeData = await gratitudeRes.json();

      const sessions = sessionsData.sessions || [];
      const completedSessions = sessions.filter((s: { isCompleted: boolean }) => s.isCompleted);
      const totalMessages = sessions.flatMap((s: { messages: any[] }) => s.messages || []);

      const totalReframes = totalMessages.filter((m: { reframe: string | null }) =>
        m.reframe && m.reframe.trim().length > 0
      ).length;

      const totalDistortions = totalMessages.filter((m: { thoughtPattern: string | null; distortionType: string | null }) =>
        (m.thoughtPattern && m.thoughtPattern.trim().length > 0) ||
        (m.distortionType && m.distortionType.trim().length > 0)
      ).length;

      const distortionCounts: Record<string, number> = {};
      totalMessages.forEach((msg: { thoughtPattern: string | null; distortionType: string | null }) => {
        const distortion = msg.thoughtPattern || msg.distortionType;
        if (distortion && distortion.trim()) {
          distortionCounts[distortion] = (distortionCounts[distortion] || 0) + 1;
        }
      });

      const topDistortions = Object.entries(distortionCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const layerCounts: Record<string, number> = { surface: 0, trigger: 0, emotion: 0, coreBelief: 0 };
      sessions.forEach((s: { currentLayer: string }) => {
        const layer = s.currentLayer || 'surface';
        if (layerCounts[layer] !== undefined) layerCounts[layer]++;
      });

      const layerOrder = ['surface', 'trigger', 'emotion', 'coreBelief'];
      const layerProgress = layerOrder.map((layer) => ({
        layer,
        count: layerCounts[layer],
        percentage: sessions.length > 0 ? Math.round((layerCounts[layer] / sessions.length) * 100) : 0,
      }));

      const layerDepth: Record<string, number> = { surface: 0, trigger: 1, emotion: 2, coreBelief: 3 };
      const averageSessionDepth =
        sessions.length > 0
          ? sessions.reduce((sum: number, s: { currentLayer: string }) => sum + (layerDepth[s.currentLayer] || 0), 0) / sessions.length
          : 0;

      const coreBeliefs: string[] = sessions
        .map((s: { coreBelief: string | null }) => s.coreBelief)
        .filter((b): b is string => b !== null && b.length > 0)
        .slice(0, 5);

      const emotionPatterns = ['anxious', 'sad', 'angry', 'ashamed', 'exhausted', 'confused', 'disappointed', 'inadequate', 'unsettled'];
      const emotionCounts: Record<string, number> = {};
      totalMessages.forEach((msg: { content: string; layerInsight?: string }) => {
        const text = ((msg.content || '') + ' ' + (msg.layerInsight || '')).toLowerCase();
        emotionPatterns.forEach((emotion) => {
          if (text.includes(emotion)) emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
      });

      const topEmotions = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const recentMoods = (moodData.entries || []).slice(0, 7);
      let moodTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentMoods.length >= 3) {
        const firstHalf = recentMoods.slice(0, Math.floor(recentMoods.length / 2));
        const secondHalf = recentMoods.slice(Math.floor(recentMoods.length / 2));
        const firstAvg = firstHalf.reduce((sum: number, e: MoodEntry) => sum + e.mood, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum: number, e: MoodEntry) => sum + e.mood, 0) / secondHalf.length;
        if (secondAvg > firstAvg + 0.5) moodTrend = 'up';
        else if (secondAvg < firstAvg - 0.5) moodTrend = 'down';
      }

      const today = new Date();
      let streakDays = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const hasEntry = (moodData.entries || []).some((e: MoodEntry) => {
          const entryDate = new Date(e.createdAt);
          return entryDate.toDateString() === checkDate.toDateString();
        });
        if (hasEntry) streakDays++;
        else if (i > 0) break;
      }

      setStats({
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        totalReframes,
        totalDistortions,
        topDistortions,
        topEmotions,
        averageMood: moodData.stats?.averageMood || 0,
        moodTrend,
        gratitudeCount: gratitudeData.entries?.length || 0,
        streakDays,
        layerProgress,
        coreBeliefs,
        averageSessionDepth,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Premium mood chart
  const MoodChart = ({ data }: { data: MoodEntry[] }) => {
    if (data.length === 0) return null;
    const reversedData = [...data].reverse().slice(-14);
    const maxMood = 10;
    const chartWidth = 300;
    const chartHeight = 100;
    const padding = 10;

    const points = reversedData
      .map((entry, index) => {
        const x = padding + (index / (reversedData.length - 1 || 1)) * (chartWidth - padding * 2);
        const y = chartHeight - padding - (entry.mood / maxMood) * (chartHeight - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    const areaPoints = `${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`;

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
        <defs>
          <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.45 0.2 270)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="oklch(0.45 0.2 270)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#moodGradient)" />
        <polyline points={points} fill="none" stroke="oklch(0.45 0.2 270)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {reversedData.map((entry, index) => {
          const x = padding + (index / (reversedData.length - 1 || 1)) * (chartWidth - padding * 2);
          const y = chartHeight - padding - (entry.mood / maxMood) * (chartHeight - padding * 2);
          return <circle key={entry.id} cx={x} cy={y} r="3" fill="oklch(0.45 0.2 270)" />;
        })}
      </svg>
    );
  };

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

  // Redirect to home if not signed in
  if (!isSignedIn) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden noise">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]" style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 270), oklch(0.55 0.22 300))' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full opacity-15 blur-[100px]" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 200), oklch(0.45 0.2 270))' }} />
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="glass border-b border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 rounded-xl hover:bg-secondary/80 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium">
                  <TrendingUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Your Progress</h1>
                  <p className="text-xs text-muted-foreground">Track your mental wellness journey</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleDark} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                  <AnimatePresence mode="wait" initial={false}>
                    {isDark ? (
                      <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Sun className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Moon className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
              <div className="absolute inset-2 rounded-xl bg-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="absolute inset-4 rounded-lg bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Target, label: 'Sessions', value: stats?.totalSessions || 0, color: 'text-primary' },
                { icon: Award, label: 'Completed', value: stats?.completedSessions || 0, color: 'text-accent' },
                { icon: Brain, label: 'Reframes', value: stats?.totalReframes || 0, color: 'text-primary' },
                { icon: Calendar, label: 'Streak', value: `${stats?.streakDays || 0} days`, color: 'text-accent' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl border border-border/50 p-5 shadow-premium"
                >
                  <div className={cn('flex items-center gap-2 mb-3', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Mood Chart */}
            {moodHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl border border-border/50 p-6 shadow-premium"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Mood Trend</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Avg: {stats?.averageMood}/10</span>
                    <span className={cn('text-sm font-medium px-2 py-1 rounded-lg', stats?.moodTrend === 'up' && 'bg-accent/10 text-accent', stats?.moodTrend === 'down' && 'bg-destructive/10 text-destructive', stats?.moodTrend === 'stable' && 'bg-secondary text-muted-foreground')}>
                      {stats?.moodTrend === 'up' && '↑ Improving'}
                      {stats?.moodTrend === 'down' && '↓ Declining'}
                      {stats?.moodTrend === 'stable' && '→ Stable'}
                    </span>
                  </div>
                </div>
                <MoodChart data={moodHistory} />
              </motion.div>
            )}

            {/* Top Distortions */}
            {stats?.topDistortions && stats.topDistortions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-2xl border border-border/50 p-6 shadow-premium"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Your Common Patterns</h3>
                </div>
                <div className="space-y-4">
                  {stats.topDistortions.map((distortion, index) => (
                    <div key={distortion.type} className="flex items-center gap-4">
                      <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary text-sm flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{distortion.type}</span>
                          <span className="text-sm text-muted-foreground">{distortion.count}x</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all" style={{ width: `${(distortion.count / (stats.topDistortions[0]?.count || 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Iceberg Layer Progress */}
            {stats?.layerProgress && stats.layerProgress.some((l) => l.count > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="glass rounded-2xl border border-border/50 p-6 shadow-premium"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Your Iceberg Depth</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Avg Depth</p>
                    <p className="text-lg font-bold text-primary">{((stats?.averageSessionDepth || 0) * 33.3).toFixed(0)}%</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {stats.layerProgress.map((layer, index) => {
                    const layerColors = ['bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-primary'];
                    const layerLabels = ['Surface', 'Trigger', 'Emotion', 'Core Belief'];
                    return (
                      <div key={layer.layer} className="flex items-center gap-4">
                        <div className={cn('w-3 h-3 rounded-full', layerColors[index])} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{layerLabels[index]}</span>
                            <span className="text-sm text-muted-foreground">{layer.count} sessions ({layer.percentage}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', layerColors[index])} style={{ width: `${layer.percentage}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4">💡 Sessions that reach Core Belief have the deepest therapeutic impact</p>
              </motion.div>
            )}

            {/* Core Beliefs Discovered */}
            {stats?.coreBeliefs && stats.coreBeliefs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}
                className="glass rounded-2xl border border-primary/20 p-6 shadow-premium bg-gradient-to-br from-primary/5 to-transparent"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Core Beliefs You&apos;ve Discovered</h3>
                </div>
                <div className="space-y-3">
                  {stats.coreBeliefs.map((belief, index) => (
                    <div key={index} className="flex items-start gap-3 bg-secondary/50 rounded-xl p-4 border border-border/50">
                      <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">{belief}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mood Tracker & Gratitude Journal */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <MoodTracker onMoodLogged={fetchStats} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <GratitudeJournal />
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
