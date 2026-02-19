'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageCircle,
  Eye
} from 'lucide-react';
import { SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface CopilotAnalysis {
  responseApproach: {
    action: string;
    dontDo: string;
  };
  replyDraft: string;
  whatToExpect: string;
  emotionalState: {
    intensity: 'Low' | 'Moderate' | 'High' | 'Severe';
    guidance: string;
  };
  riskLevel: {
    level: 'None' | 'Distress' | 'Panic' | 'Shutdown';
    action: string;
  };
  reasoning: {
    situationType: string;
    patterns: string[];
    primaryEmotion: string;
  };
}

const INTENSITY_COLORS: Record<string, string> = {
  Low: 'text-green-600 bg-green-100 border-green-200',
  Moderate: 'text-yellow-700 bg-yellow-100 border-yellow-200',
  High: 'text-orange-600 bg-orange-100 border-orange-200',
  Severe: 'text-red-600 bg-red-100 border-red-200',
};

const RISK_COLORS: Record<string, string> = {
  None: 'text-green-600 bg-green-100 border-green-200',
  Distress: 'text-yellow-700 bg-yellow-100 border-yellow-200',
  Panic: 'text-red-600 bg-red-100 border-red-200',
  Shutdown: 'text-purple-600 bg-purple-100 border-purple-200',
};

export default function AssistPage() {
  const { isSignedIn } = useUser();
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useCount, setUseCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('copilot_use_count') || '0');
    setUseCount(count);
  }, []);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 10) {
      setError('Please provide a message to analyze (at least 10 characters).');
      return;
    }

    const currentCount = parseInt(localStorage.getItem('copilot_use_count') || '0');
    if (currentCount >= 1 && !isSignedIn) {
      setShowPaywall(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      
      const newCount = currentCount + 1;
      localStorage.setItem('copilot_use_count', newCount.toString());
      setUseCount(newCount);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Assist</h1>
                <p className="text-xs text-slate-500">Know what to do. Not just what it means.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/reflect" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                ← Switch to Reflect
              </Link>
              {isSignedIn && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  ✓ Signed in
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Paste the message you received
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste a message from a client, patient, or anyone you're helping..."
            className="w-full h-40 p-4 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-700 placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-400">
              {message.length} characters
            </span>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Analyze Message
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Paywall */}
        <AnimatePresence>
          {showPaywall && !isSignedIn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  Save Your Analyses
                </h2>
                <p className="text-slate-600 mb-6">
                  Create a free account to save your analysis history and unlock unlimited analyses.
                </p>
                <SignInButton mode="modal">
                  <button className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 transition-all">
                    Sign Up Free
                  </button>
                </SignInButton>
                <button
                  onClick={() => setShowPaywall(false)}
                  className="mt-3 text-sm text-slate-500 hover:text-slate-700"
                >
                  Continue without saving
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* 1. BEHAVIORAL GUIDANCE - What to DO */}
              <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowRight className="w-5 h-5 text-teal-600" />
                    <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                      What to Do
                    </span>
                  </div>
                  
                  {/* DO */}
                  <div className="flex items-start gap-3 mb-4 p-3 bg-teal-50 rounded-xl border border-teal-200">
                    <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <p className="text-teal-800 font-medium">{analysis.responseApproach.action}</p>
                  </div>
                  
                  {/* DON'T */}
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700">{analysis.responseApproach.dontDo}</p>
                  </div>
                </div>
              </div>

              {/* 2. REPLY DRAFT */}
              <div className="bg-white rounded-2xl shadow-lg border border-teal-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                    Suggested Reply
                  </span>
                  <button
                    onClick={() => copyToClipboard(analysis.replyDraft)}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-slate-700 italic leading-relaxed text-lg">
                  &ldquo;{analysis.replyDraft}&rdquo;
                </p>
              </div>

              {/* 3. WHAT TO EXPECT */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-teal-600" />
                  <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                    What to Expect
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {analysis.whatToExpect}
                </p>
              </div>

              {/* 4. EMOTIONAL STATE & RISK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emotional State */}
                <div className="bg-white rounded-2xl shadow-lg border border-teal-100 p-5">
                  <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide block mb-3">
                    Emotional State
                  </span>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${INTENSITY_COLORS[analysis.emotionalState.intensity]}`}>
                      {analysis.emotionalState.intensity} Intensity
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {analysis.emotionalState.guidance}
                  </p>
                </div>

                {/* Risk Level */}
                <div className="bg-white rounded-2xl shadow-lg border border-teal-100 p-5">
                  <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide block mb-3">
                    Risk Level
                  </span>
                  <div className="flex items-center gap-2 mb-3">
                    {analysis.riskLevel.level !== 'None' && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${RISK_COLORS[analysis.riskLevel.level]}`}>
                      {analysis.riskLevel.level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {analysis.riskLevel.action}
                  </p>
                </div>
              </div>

              {/* 5. WHY THE ASSISTANT THINKS THIS */}
              <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Why the assistant thinks this
                  </span>
                  {showReasoning ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <AnimatePresence>
                  {showReasoning && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Situation Type</span>
                          <span className="text-sm font-medium text-slate-700">{analysis.reasoning.situationType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Primary Emotion</span>
                          <span className="text-sm font-medium text-slate-700 capitalize">{analysis.reasoning.primaryEmotion}</span>
                        </div>
                        {analysis.reasoning.patterns.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Patterns Detected</span>
                            <span className="text-sm font-medium text-slate-700">{analysis.reasoning.patterns.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate New */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate new reply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!analysis && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Paste a message to get started
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              I&apos;ll tell you exactly how to respond - what to do, what to avoid, and a draft to start with.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-16 pointer-events-none" />
      <div className="fixed bottom-3 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-slate-400">
          Not a replacement for professional judgment. For informational purposes only.
        </p>
      </div>
    </div>
  );
}
