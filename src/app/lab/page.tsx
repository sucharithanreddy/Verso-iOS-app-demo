'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Moon,
  Sun,
  Sparkles,
  Brain,
  Wind,
  HelpCircle,
  Target,
  Zap,
  Eye,
  Heart,
  Flame,
  TrendingDown,
  X,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNav } from '@/components/MobileNav';

// ============================================================================
// QUICK TOOLS - The Gatekeeper
// ============================================================================

function GroundingExercise({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState('');
  
  const steps = [
    { sense: 'see', count: 5, icon: Eye, color: 'text-blue-500' },
    { sense: 'touch', count: 4, icon: Heart, color: 'text-purple-500' },
    { sense: 'hear', count: 3, icon: '👂', color: 'text-green-500' },
    { sense: 'smell', count: 2, icon: '👃', color: 'text-amber-500' },
    { sense: 'taste', count: 1, icon: '👅', color: 'text-rose-500' },
  ];

  const currentStep = steps[step];
  const progress = items.length;
  const needed = currentStep.count;

  const handleAdd = () => {
    if (input.trim()) {
      setItems([...items, input.trim()]);
      setInput('');
    }
  };

  const handleNext = () => {
    if (progress >= needed && step < steps.length - 1) {
      setStep(step + 1);
      setItems([]);
    }
  };

  const isComplete = step === steps.length - 1 && progress >= needed;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-full transition-all', i <= step ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-premium">
                <Check className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Well Done!</h2>
              <p className="text-muted-foreground mb-6">You've grounded yourself. Take a deep breath.</p>
              <Button onClick={onClose} className="bg-primary text-primary-foreground shadow-premium glow-primary">
                Continue
              </Button>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className={cn('text-6xl mb-4', currentStep.color)}>
                  {typeof currentStep.icon === 'string' ? currentStep.icon : <currentStep.icon className="w-16 h-16 mx-auto" />}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Name {needed} thing{needed > 1 ? 's' : ''} you {currentStep.sense}
                </h2>
                <p className="text-muted-foreground">{progress} of {needed}</p>
              </div>

              {/* Input */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={`I ${currentStep.sense}...`}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground placeholder:text-muted-foreground/60"
                    autoFocus
                  />
                  <Button onClick={handleAdd} disabled={!input.trim()} className="bg-primary text-primary-foreground">
                    Add
                  </Button>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {items.map((item, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                      {item}
                    </span>
                  ))}
                </div>

                {progress >= needed && (
                  <Button onClick={handleNext} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-premium">
                    Next Step
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BreathworkExercise({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  
  const phases = [
    { name: 'Inhale', duration: 4000, scale: 1.5 },
    { name: 'Hold', duration: 4000, scale: 1.5 },
    { name: 'Exhale', duration: 4000, scale: 1 },
    { name: 'Hold', duration: 4000, scale: 1 },
  ];

  useEffect(() => {
    if (!isActive) return;
    
    const timer = setTimeout(() => {
      setPhase((prev) => {
        if (prev === phases.length - 1) {
          setCycles((c) => c + 1);
          return 0;
        }
        return prev + 1;
      });
    }, phases[phase].duration);

    return () => clearTimeout(timer);
  }, [isActive, phase]);

  const currentPhase = phases[phase];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="text-center">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground transition-colors">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-semibold text-foreground mb-2">Box Breathing</h2>
        <p className="text-muted-foreground mb-8">4-4-4-4 Rhythm</p>

        {/* Animated box */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <motion.div
            animate={{ scale: isActive ? currentPhase.scale : 1 }}
            transition={{ duration: currentPhase.duration / 1000, ease: 'easeInOut' }}
            className="w-full h-full rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-premium"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-primary-foreground">
              {isActive ? currentPhase.name : 'Start'}
            </span>
          </div>
        </div>

        {/* Cycles counter */}
        <p className="text-muted-foreground mb-6">Cycles: {cycles}</p>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isActive ? (
            <Button onClick={() => setIsActive(true)} className="bg-primary text-primary-foreground shadow-premium glow-primary">
              <Play className="w-4 h-4 mr-2" />
              Begin
            </Button>
          ) : (
            <Button onClick={() => setIsActive(false)} variant="outline" className="border-border/50">
              Pause
            </Button>
          )}
          <Button onClick={() => { setPhase(0); setCycles(0); setIsActive(false); }} variant="ghost">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function RealityCheck({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);

  const questions = [
    {
      question: 'Is this a fact or a feeling?',
      hint: 'Separate what you know from what you feel.',
      placeholder: 'This is a...',
    },
    {
      question: 'What is the evidence?',
      hint: 'What facts support or contradict this thought?',
      placeholder: 'The evidence is...',
    },
    {
      question: 'What is a more likely outcome?',
      hint: 'Consider what\'s most probable, not worst-case.',
      placeholder: 'A more likely outcome is...',
    },
  ];

  const handleComplete = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {questions.map((_, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-full transition-all', i <= step ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step >= questions.length ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-premium">
                <Check className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Reality Checked!</h2>
              <p className="text-muted-foreground mb-6">You've examined the evidence objectively.</p>
              <Button onClick={handleComplete} className="bg-primary text-primary-foreground shadow-premium glow-primary">
                Continue
              </Button>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-xl font-bold text-foreground text-center mb-2">{questions[step].question}</h2>
                <p className="text-muted-foreground text-center text-sm">{questions[step].hint}</p>
              </div>

              <textarea
                value={answers[step]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[step] = e.target.value;
                  setAnswers(newAnswers);
                }}
                placeholder={questions[step].placeholder}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                {step > 0 && (
                  <Button onClick={() => setStep(step - 1)} variant="ghost" className="flex-1">
                    Back
                  </Button>
                )}
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!answers[step].trim()}
                  className="flex-1 bg-primary text-primary-foreground shadow-premium"
                >
                  {step === questions.length - 1 ? 'Complete' : 'Next'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PRACTICE - The Rebuilder
// ============================================================================

function ReframeLab() {
  const [thought, setThought] = useState('');
  const [result, setResult] = useState<{ label: string; reframe: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!thought.trim()) return;
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userMessage: thought, 
          conversationHistory: [],
          sessionContext: { mode: 'quick' }
        }),
      });
      const data = await res.json();
      setResult({
        label: data.thoughtPattern || data.distortionType || 'Pattern detected',
        reframe: data.reframe || 'Consider alternative perspectives.',
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-border/50 p-6 shadow-premium">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Reframe Lab</h3>
          <p className="text-xs text-muted-foreground">Transform negative thoughts instantly</p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Enter a negative thought..."
          className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground placeholder:text-muted-foreground/60"
          rows={2}
        />

        <Button
          onClick={handleAnalyze}
          disabled={!thought.trim() || isLoading}
          className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-premium"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </Button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 pt-4 border-t border-border/50"
          >
            <div>
              <span className="text-xs text-muted-foreground">Detected Pattern</span>
              <p className="text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-2 mt-1">{result.label}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Reframe</span>
              <p className="text-sm text-foreground bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mt-1">{result.reframe}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DistortionSpotter() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [score, setScore] = useState(0);

  const examples = [
    { thought: "I failed once, so I'm a total failure.", distortion: "All-or-Nothing Thinking", options: ["All-or-Nothing Thinking", "Overgeneralization", "Labeling", "Catastrophizing"] },
    { thought: "Everyone is judging me right now.", distortion: "Mind Reading", options: ["Mind Reading", "Fortune Telling", "Personalization", "Emotional Reasoning"] },
    { thought: "I feel stupid, therefore I am stupid.", distortion: "Emotional Reasoning", options: ["Labeling", "Emotional Reasoning", "Should Statements", "Mental Filter"] },
    { thought: "They didn't text back. They hate me.", distortion: "Mind Reading", options: ["Mind Reading", "Overgeneralization", "Catastrophizing", "All-or-Nothing Thinking"] },
    { thought: "I should always be productive.", distortion: "Should Statements", options: ["Should Statements", "All-or-Nothing Thinking", "Labeling", "Mental Filter"] },
  ];

  const current = examples[currentIndex];

  const handleSelect = (option: string) => {
    setSelected(option);
    const correct = option === current.distortion;
    setFeedback({
      correct,
      explanation: correct
        ? "Correct! You're getting good at spotting these."
        : `Not quite. This is "${current.distortion}". Keep practicing!`,
    });
    if (correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setFeedback(null);
    setCurrentIndex((i) => (i + 1) % examples.length);
  };

  return (
    <div className="glass rounded-2xl border border-border/50 p-6 shadow-premium">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
            <Eye className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Distortion Spotter</h3>
            <p className="text-xs text-muted-foreground">Train your pattern recognition</p>
            </div>
        </div>
        <span className="text-sm font-medium text-primary">Score: {score}</span>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-4 border border-border/30">
          <p className="text-foreground italic">"{current.thought}"</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {current.options.map((option) => (
            <button
              key={option}
              onClick={() => !feedback && handleSelect(option)}
              disabled={!!feedback}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-medium transition-all text-left',
                feedback
                  ? option === current.distortion
                    ? 'bg-primary text-primary-foreground'
                    : selected === option
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-secondary/50 text-muted-foreground'
                  : 'bg-secondary/50 text-foreground hover:bg-secondary border border-border/30'
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className={cn('text-sm', feedback.correct ? 'text-primary' : 'text-muted-foreground')}>
              {feedback.explanation}
            </p>
            <Button onClick={handleNext} variant="outline" className="w-full border-border/50">
              Next Example
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// GOALS - The Metrics
// ============================================================================

function GoalsSection() {
  // Mock data - in real app, this would come from API
  const goals = [
    {
      title: 'Lower Anxiety',
      icon: TrendingDown,
      current: 6.2,
      target: 4.0,
      unit: '/10 avg',
      progress: 65,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Patterns Interrupted',
      icon: Zap,
      current: 12,
      target: 20,
      unit: 'thoughts',
      progress: 60,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Daily Streak',
      icon: Flame,
      current: 4,
      target: 7,
      unit: 'days',
      progress: 57,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Your Cognitive Goals</h2>
      </div>

      <div className="grid gap-4">
        {goals.map((goal) => (
          <motion.div
            key={goal.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl border border-border/50 p-5 shadow-premium"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', goal.color)}>
                  <goal.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{goal.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {goal.current} / {goal.target} {goal.unit}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground">{goal.progress}%</span>
            </div>

            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn('h-full rounded-full bg-gradient-to-r', goal.color)}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN LAB PAGE
// ============================================================================

export default function LabPage() {
  const { isSignedIn } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeTool, setActiveTool] = useState<'grounding' | 'breathwork' | 'reality' | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDark);
  };

  if (!mounted) {
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
    <div className="min-h-screen bg-background relative overflow-hidden noise">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]" style={{ background: 'linear-gradient(135deg, oklch(0.75 0.15 70), oklch(0.65 0.18 50))' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full opacity-15 blur-[100px]" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.18 200), oklch(0.45 0.2 270))' }} />
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      {/* Mobile Header */}
      <MobileHeader
        title="The Lab"
        subtitle="Train your mind"
        icon="lab"
        onToggleDark={toggleDark}
        isDark={isDark}
        rightAction={
          isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl">
                Sign In
              </button>
            </SignInButton>
          )
        }
      />

      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hide-on-mobile">
        <div className="glass border-b border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 rounded-xl hover:bg-secondary/80 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-premium">
                  <Sparkles className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">The Lab</h1>
                  <p className="text-xs text-muted-foreground">Train your mind</p>
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
                <Link href="/reflect"><Button variant="ghost" size="sm" className="text-muted-foreground">Reflect →</Button></Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 md:space-y-10 pb-mobile">
        {/* Quick Tools Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Quick Tools</h2>
            <span className="text-xs text-muted-foreground ml-2">Tap to start</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setActiveTool('grounding')}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 shadow-premium hover:shadow-lg transition-all"
            >
              <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                <Brain className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-lg">Grounding</span>
                <span className="text-xs opacity-80">5-4-3-2-1 Technique</span>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setActiveTool('breathwork')}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-500 shadow-premium hover:shadow-lg transition-all"
            >
              <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                <Wind className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-lg">Breathwork</span>
                <span className="text-xs opacity-80">Box Breathing</span>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setActiveTool('reality')}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 shadow-premium hover:shadow-lg transition-all"
            >
              <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                <HelpCircle className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-lg">Reality Check</span>
                <span className="text-xs opacity-80">Is this true?</span>
              </div>
            </motion.button>
          </div>
        </section>

        {/* Practice Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Practice</h2>
            <span className="text-xs text-muted-foreground ml-2">Train your mind</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ReframeLab />
            <DistortionSpotter />
          </div>
        </section>

        {/* Goals Section */}
        <section>
          <GoalsSection />
        </section>
      </main>

      {/* Tool Overlays */}
      <AnimatePresence>
        {activeTool === 'grounding' && <GroundingExercise onClose={() => setActiveTool(null)} />}
        {activeTool === 'breathwork' && <BreathworkExercise onClose={() => setActiveTool(null)} />}
        {activeTool === 'reality' && <RealityCheck onClose={() => setActiveTool(null)} />}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
