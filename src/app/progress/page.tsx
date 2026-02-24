'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Calendar,
  Target,
  Heart,
  Brain,
  Sparkles,
  Award,
  ChevronLeft,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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

      // Calculate stats
      const sessions = sessionsData.sessions || [];
      const completedSessions = sessions.filter((s: { isCompleted: boolean }) => s.isCompleted);
      const totalMessages = sessions.flatMap((s: { messages: any[] }) => s.messages || []);

      // ✅ FIXED: Count reframes (messages with reframe field populated)
      const totalReframes = totalMessages.filter((m: { reframe: string | null }) => 
        m.reframe && m.reframe.trim().length > 0
      ).length;

      // ✅ FIXED: Count distortions using BOTH thoughtPattern (new) AND distortionType (legacy)
      const totalDistortions = totalMessages.filter((m: { thoughtPattern: string | null; distortionType: string | null }) => 
        (m.thoughtPattern && m.thoughtPattern.trim().length > 0) ||
        (m.distortionType && m.distortionType.trim().length > 0)
      ).length;

      // Get distortions - check both new and legacy fields
      const distortionCounts: Record<string, number> = {};
      totalMessages.forEach((msg: { thoughtPattern: string | null; distortionType: string | null }) => {
        // Prefer thoughtPattern (new field), fallback to distortionType (legacy)
        const distortion = msg.thoughtPattern || msg.distortionType;
        if (distortion && distortion.trim()) {
          distortionCounts[distortion] = (distortionCounts[distortion] || 0) + 1;
        }
      });

      const topDistortions = Object.entries(distortionCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get iceberg layer progress
      const layerCounts: Record<string, number> = { surface: 0, trigger: 0, emotion: 0, coreBelief: 0 };
      sessions.forEach((s: { currentLayer: string }) => {
        const layer = s.currentLayer || 'surface';
        if (layerCounts[layer] !== undefined) {
          layerCounts[layer]++;
        }
      });

      const layerOrder = ['surface', 'trigger', 'emotion', 'coreBelief'];
      const layerProgress = layerOrder.map((layer) => ({
        layer,
        count: layerCounts[layer],
        percentage: sessions.length > 0 ? Math.round((layerCounts[layer] / sessions.length) * 100) : 0,
      }));

      // Calculate average session depth (0-3 scale)
      const layerDepth: Record<string, number> = { surface: 0, trigger: 1, emotion: 2, coreBelief: 3 };
      const averageSessionDepth =
        sessions.length > 0
          ? sessions.reduce((sum: number, s: { currentLayer: string }) => sum + (layerDepth[s.currentLayer] || 0), 0) /
            sessions.length
          : 0;

      // Get core beliefs discovered
      const coreBeliefs: string[] = sessions
        .map((s: { coreBelief: string | null }) => s.coreBelief)
        .filter((b): b is string => b !== null && b.length > 0)
        .slice(0, 5);

      // Get emotions from layer insights (extract emotion words)
      const emotionPatterns = [
        'anxious',
        'sad',
        'angry',
        'ashamed',
        'exhausted',
        'confused',
        'disappointed',
        'inadequate',
        'unsettled',
      ];
      const emotionCounts: Record<string, number> = {};
      totalMessages.forEach((msg: { content: string; layerInsight?: string }) => {
        const text = ((msg.content || '') + ' ' + (msg.layerInsight || '')).toLowerCase();
        emotionPatterns.forEach((emotion) => {
          if (text.includes(emotion)) {
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          }
        });
      });

      const topEmotions = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate mood trend
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

      // Calculate streak (simplified)
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

  // Simple mood chart (SVG-based)
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
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#moodGradient)" />
        <polyline
          points={points}
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {reversedData.map((entry, index) => {
          const x = padding + (index / (reversedData.length - 1 || 1)) * (chartWidth - padding * 2);
          const y = chartHeight - padding - (entry.mood / maxMood) * (chartHeight - padding * 2);
          return <circle key={entry.id} cx={x} cy={y} r="3" fill="rgb(59, 130, 246)" />;
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Your Progress
                </h1>
                <p className="text-xs text-gray-500">Track your mental wellness journey</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4"
              >
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="text-sm font-medium">Sessions</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalSessions || 0}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4"
              >
                <div className="flex items-center gap-2 text-teal-500 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats?.completedSessions || 0}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4"
              >
                <div className="flex items-center gap-2 text-sky-500 mb-2">
                  <Brain className="w-5 h-5" />
                  <span className="text-sm font-medium">Reframes</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalReframes || 0}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4"
              >
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-medium">Streak</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{stats?.streakDays || 0} days</p>
              </motion.div>
            </div>

            {/* Mood Chart */}
            {moodHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-800">Mood Trend</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Avg: {stats?.averageMood}/10</span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        stats?.moodTrend === 'up' && 'text-teal-500',
                        stats?.moodTrend === 'down' && 'text-rose-500',
                        stats?.moodTrend === 'stable' && 'text-gray-500'
                      )}
                    >
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
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-gray-800">Your Common Patterns</h3>
                </div>
                <div className="space-y-3">
                  {stats.topDistortions.map((distortion, index) => (
                    <div key={distortion.type} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{distortion.type}</span>
                          <span className="text-sm text-gray-500">{distortion.count}x</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                            style={{
                              width: `${(distortion.count / (stats.topDistortions[0]?.count || 1)) * 100}%`,
                            }}
                          />
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
                className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-500" />
                    <h3 className="text-lg font-semibold text-gray-800">Your Iceberg Depth</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Avg Depth</p>
                    <p className="text-lg font-bold text-teal-600">
                      {((stats?.averageSessionDepth || 0) * 33.3).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {stats.layerProgress.map((layer, index) => {
                    const layerColors = ['bg-sky-400', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500'];
                    const layerLabels = ['Surface', 'Trigger', 'Emotion', 'Core Belief'];
                    return (
                      <div key={layer.layer} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${layerColors[index]}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">{layerLabels[index]}</span>
                            <span className="text-sm text-gray-500">
                              {layer.count} sessions ({layer.percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${layerColors[index]} rounded-full transition-all`}
                              style={{ width: `${layer.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  💡 Sessions that reach Core Belief have the deepest therapeutic impact
                </p>
              </motion.div>
            )}

            {/* Core Beliefs Discovered */}
            {stats?.coreBeliefs && stats.coreBeliefs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}
                className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  <h3 className="text-lg font-semibold text-gray-800">Core Beliefs You&apos;ve Discovered</h3>
                </div>
                <div className="space-y-2">
                  {stats.coreBeliefs.map((belief, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white/60 rounded-xl p-3">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm text-gray-700">{belief}</p>
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
