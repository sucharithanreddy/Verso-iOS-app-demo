'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Frown, Meh, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MoodEntry {
  id: string;
  mood: number;
  emotions: string | null;
  notes: string | null;
  triggers: string | null;
  createdAt: string;
}

interface MoodStats {
  averageMood: number;
  totalEntries: number;
  emotionFrequency: { emotion: string; count: number }[];
}

const MOOD_EMOJIS = {
  1: '😢',
  2: '😞',
  3: '😔',
  4: '😕',
  5: '😐',
  6: '🙂',
  7: '😊',
  8: '😄',
  9: '😁',
  10: '🤩',
};

const EMOTIONS = [
  'Happy', 'Calm', 'Grateful', 'Hopeful', 'Proud',
  'Anxious', 'Stressed', 'Sad', 'Angry', 'Frustrated',
  'Lonely', 'Overwhelmed', 'Tired', 'Confused', 'Excited',
];

interface MoodTrackerProps {
  onMoodLogged?: () => void;
}

export function MoodTracker({ onMoodLogged }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<number>(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchMoodData();
  }, []);

  const fetchMoodData = async () => {
    try {
      const res = await fetch('/api/mood?days=30');
      const data = await res.json();
      setEntries(data.entries || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching mood data:', error);
    }
  };

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          emotions: selectedEmotions,
          notes: notes || null,
          triggers: triggers || null,
        }),
      });

      const data = await res.json();
      if (data.crisisAlert) {
        alert('We noticed you might be going through a difficult time. Your therapist has been notified and resources are available.');
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedMood(5);
        setSelectedEmotions([]);
        setNotes('');
        setTriggers('');
        fetchMoodData();
        onMoodLogged?.();
      }, 2000);
    } catch (error) {
      console.error('Error logging mood:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-800">Daily Check-in</h3>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Avg: {stats.averageMood}/10
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-6xl mb-4"
            >
              ✨
            </motion.div>
            <p className="text-gray-600 font-medium">Mood logged successfully!</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Mood Slider */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                How are you feeling right now?
              </label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-4xl">{MOOD_EMOJIS[selectedMood as keyof typeof MOOD_EMOJIS]}</span>
                <span className="text-2xl font-bold text-blue-600">{selectedMood}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={selectedMood}
                onChange={(e) => setSelectedMood(parseInt(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Very Low</span>
                <span>Neutral</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Emotions */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                What emotions are you experiencing?
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => toggleEmotion(emotion)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-all',
                      selectedEmotions.includes(emotion)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {emotion}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Share the one thing that made a difference today!
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's on your mind..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Triggers */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                What might have influenced your mood? (optional)
              </label>
              <input
                type="text"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                placeholder="e.g., work stress, lack of sleep, good news..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
            >
              {isSubmitting ? 'Saving...' : 'Log Mood'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Toggle */}
      {entries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {showHistory ? 'Hide' : 'Show'} Recent Entries ({entries.length})
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  {entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <span className="text-2xl">{MOOD_EMOJIS[entry.mood as keyof typeof MOOD_EMOJIS]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{entry.mood}/10</span>
                          {entry.emotions && (
                            <span className="text-xs text-gray-500 truncate">
                              {JSON.parse(entry.emotions).join(', ')}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 truncate">{entry.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
