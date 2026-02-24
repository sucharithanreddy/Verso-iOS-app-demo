'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Trash2, Sun, Star, Users, Briefcase, HeartPulse, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GratitudeEntry {
  id: string;
  content: string;
  category: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'relationships', label: 'Relationships', icon: Users },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'nature', label: 'Nature', icon: Sun },
  { id: 'growth', label: 'Personal Growth', icon: Star },
  { id: 'other', label: 'Other', icon: Heart },
];

const PROMPTS = [
  "What made you smile today?",
  "Who are you grateful to have in your life?",
  "What's something small that brought you joy recently?",
  "What accomplishment are you proud of?",
  "What's a comfort you're thankful for?",
  "What's something beautiful you noticed today?",
];

export function GratitudeJournal() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(() => setCurrentPrompt(prev => (prev + 1) % PROMPTS.length), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/gratitude?limit=30');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching gratitude entries:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newEntry.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newEntry.trim(), category: selectedCategory }),
      });
      if (res.ok) {
        setNewEntry('');
        setSelectedCategory(null);
        setShowForm(false);
        fetchEntries();
      }
    } catch (error) {
      console.error('Error creating gratitude entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/gratitude?id=${id}`, { method: 'DELETE' });
      if (res.ok) setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  return (
    <div className="glass rounded-2xl border border-border/50 p-6 shadow-premium">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent fill-accent" />
          <h3 className="text-lg font-semibold text-foreground">Gratitude Journal</h3>
        </div>
        <span className="text-sm text-muted-foreground">{entries.length} entries</span>
      </div>

      {/* Prompt */}
      <motion.div
        key={currentPrompt}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 mb-6 border border-primary/10"
      >
        <p className="text-foreground text-sm italic">💭 {PROMPTS[currentPrompt]}</p>
      </motion.div>

      {/* Add Entry Form */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
            <textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="I'm grateful for..."
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none mb-3 text-foreground placeholder:text-muted-foreground/60"
              rows={3}
              autoFocus
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-premium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  )}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!newEntry.trim() || isSubmitting} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-premium glow-primary">
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-primary-foreground mb-6 shadow-premium">
            <Plus className="w-4 h-4 mr-2" />
            Add Gratitude Entry
          </Button>
        )}
      </AnimatePresence>

      {/* Entries List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>No entries yet. Start your gratitude practice today!</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-secondary/50 rounded-xl p-4 border border-border/30 hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-foreground">{entry.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {entry.category && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-medium">{entry.category}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
