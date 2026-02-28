'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  History,
  TrendingUp,
  Download,
  ArrowLeft,
  Trash2,
  CheckSquare,
  Square,
  X,
  Moon,
  Sun,
  Sparkles,
  User,
} from 'lucide-react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { IcebergVisualization, IcebergLayer } from '@/components/IcebergVisualization';
import { DraggableBubble } from '@/components/DraggableBubble';
import { ThoughtInput } from '@/components/ThoughtInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNav } from '@/components/MobileNav';

type UserIntent = 'AUTO' | 'CALM' | 'CLARITY' | 'NEXT_STEP' | 'MEANING' | 'LISTEN';

interface ReframeResponse {
  acknowledgment: string;
  surface?: string;
  trigger?: string;
  emotion?: string;
  coreBelief?: string;
  question?: string;
  thoughtPattern?: string;
  patternNote?: string;
  distortionType?: string;
  distortionExplanation?: string;
  reframe?: string;
  probingQuestion?: string;
  encouragement?: string;
  icebergLayer?: IcebergLayer;
  layerInsight?: string;
  progressScore?: number;
  layerProgress?: {
    surface: number;
    trigger: number;
    emotion: number;
    coreBelief: number;
  };
  progressNote?: string;
  groundingMode?: boolean;
  groundingTurns?: number;
  _meta?: Record<string, unknown>;
}

interface SessionData {
  id: string;
  title: string | null;
  summary: string | null;
  coreBelief: string | null;
  currentLayer: string;
  isCompleted: boolean;
  createdAt: string;
  messages: Message[];
}

function safeParseJSON(maybeJson: unknown): any | null {
  if (typeof maybeJson !== 'string') return null;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function normalizeLoadedMessages(raw: Message[]): Message[] {
  return raw.map((m) => {
    if (m.role !== 'assistant') return m;

    const parsed = safeParseJSON(m.content);
    if (!parsed || typeof parsed !== 'object') return m;

    const acknowledgment = (parsed.acknowledgment ?? parsed.content ?? m.content ?? '').toString();

    return {
      ...m,
      content: acknowledgment,
      question: ((parsed.question ?? parsed.probingQuestion ?? m.question ?? m.probingQuestion ?? '') as string).trim(),
      thoughtPattern: (parsed.thoughtPattern ?? parsed.distortionType ?? m.thoughtPattern ?? m.distortionType) as any,
      patternNote: (parsed.patternNote ?? parsed.distortionExplanation ?? m.patternNote ?? m.distortionExplanation) as any,
      reframe: ((parsed.reframe ?? m.reframe ?? '') as string).trim(),
      encouragement: ((parsed.encouragement ?? m.encouragement ?? '') as string).trim(),
      icebergLayer: (parsed.icebergLayer ?? m.icebergLayer) as any,
      layerInsight: (parsed.layerInsight ?? m.layerInsight) as any,
      distortionType: (parsed.distortionType ?? m.distortionType) as any,
      distortionExplanation: (parsed.distortionExplanation ?? m.distortionExplanation) as any,
      probingQuestion: (parsed.probingQuestion ?? m.probingQuestion) as any,
    } as Message;
  });
}

function assistantHistoryContent(m: Message) {
  return JSON.stringify({
    acknowledgment: (m.content || '').trim(),
    thoughtPattern: (m.thoughtPattern || m.distortionType || '').toString().trim(),
    patternNote: (m.patternNote || m.distortionExplanation || '').toString().trim(),
    reframe: (m.reframe || '').toString().trim(),
    question: (m.question || m.probingQuestion || '').toString().trim(),
    encouragement: (m.encouragement || '').toString().trim(),
    icebergLayer: (m.icebergLayer || '').toString(),
    layerInsight: (m.layerInsight || '').toString(),
  });
}

export default function ReflectPage() {
  const { isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentLayer, setCurrentLayer] = useState<IcebergLayer>('surface');
  const [discoveredInsights, setDiscoveredInsights] = useState<Record<IcebergLayer, string | null>>({
    surface: null,
    trigger: null,
    emotion: null,
    coreBelief: null,
  });

  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [progressScore, setProgressScore] = useState(0);
  const [layerProgress, setLayerProgress] = useState({
    surface: 0,
    trigger: 0,
    emotion: 0,
    coreBelief: 0,
  });
  const [progressNote, setProgressNote] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [groundingMode, setGroundingMode] = useState(false);
  const [groundingTurns, setGroundingTurns] = useState(0);

  const [userIntent, setUserIntent] = useState<UserIntent>('AUTO');
  const [lastQuestionType, setLastQuestionType] = useState<'choice' | 'open' | ''>('');
  const [coreBeliefAlreadyDetected, setCoreBeliefAlreadyDetected] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Premium dark mode
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  // Dark mode initialization
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('🔐 Auth State - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      console.log('✅ User is signed in, loading sessions...');
      loadSessions();
    } else {
      console.log('⚠️ User is NOT signed in');
    }
  }, [isSignedIn]);

  // Load session from URL parameter
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    if (sessionIdFromUrl && isSignedIn && sessions.length > 0 && !currentSessionId) {
      const sessionExists = sessions.find(s => s.id === sessionIdFromUrl);
      if (sessionExists) {
        loadSession(sessionIdFromUrl);
      }
    }
  }, [searchParams, isSignedIn, sessions.length]);

  useEffect(() => {
    if (currentLayer === 'coreBelief' && discoveredInsights.coreBelief && currentSessionId) {
      updateSessionComplete(currentSessionId);
    }
  }, [currentLayer, discoveredInsights.coreBelief, currentSessionId]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();

      // 🔍 DEBUG: Log all sessions from API
      console.log('=== LOAD SESSIONS FROM API ===');
      console.log('Total sessions:', data.sessions?.length);
      (data.sessions || []).forEach((s: any, i: number) => {
        console.log(`  [${i}] ID: ${s.id} | Title: "${s.title}" | Messages: ${s.messages?.length}`);
      });
      console.log('==============================');

      const normalized: SessionData[] = (data.sessions || []).map((s: any) => ({
        ...s,
        messages: normalizeLoadedMessages(s.messages || []),
      }));

      setSessions(normalized);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async (firstThought: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstThought }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Session creation failed:', res.status, errorData);
        return null;
      }

      const data = await res.json();
      console.log('✅ Session created:', data.session?.id);
      return data.session?.id || null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessage = async (sessionId: string, message: Omit<Message, 'id'>) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, sessionId }),
      });
      if (!res.ok) {
        console.error('Failed to save message:', await res.text());
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateSessionComplete = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLayer: 'coreBelief',
          coreBelief: discoveredInsights.coreBelief,
          isCompleted: true,
          coreBeliefAlreadyDetected: true,
          lastQuestionType,
          groundingMode,
          groundingTurns,
          lastIntentUsed: userIntent,
        }),
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const handleSubmit = async (thought: string) => {
    const trimmed = thought.trim();
    if (!trimmed) return;

    console.log('🚀 handleSubmit - isSignedIn:', isSignedIn, 'sessionStarted:', sessionStarted);

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++requestSeqRef.current;

    let activeSessionId = currentSessionId;

    if (!sessionStarted) {
      setSessionStarted(true);

      if (isSignedIn) {
        console.log('💾 Creating session for signed-in user...');
        setIsSaving(true);
        const newId = await createSession(trimmed);
        console.log('📝 Session creation result:', newId);
        if (newId) {
          activeSessionId = newId;
          setCurrentSessionId(newId);
        }
        setIsSaving(false);
      } else {
        console.log('⚠️ User not signed in - session will not be saved');
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const conversationHistory = nextMessages.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.content : assistantHistoryContent(m),
      }));

      const previousTopics = sessions
        .slice(0, 5)
        .map((s) => s.title)
        .filter(Boolean) as string[];

      const previousDistortions = sessions
        .slice(0, 5)
        .flatMap((s) => (s.messages?.map((m) => m.distortionType).filter(Boolean) as string[]) || [])
        .filter(Boolean);

      const previousQuestions = nextMessages
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.question || m.probingQuestion || '').trim())
        .filter(Boolean) as string[];

      const previousReframes = nextMessages
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.reframe || '').trim())
        .filter(Boolean) as string[];

      const previousAcknowledgments = nextMessages
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.content || '').trim())
        .filter(Boolean) as string[];

      const previousEncouragements = nextMessages
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.encouragement || '').trim())
        .filter(Boolean) as string[];

      const originalTrigger = nextMessages.find((m) => m.role === 'user')?.content || '';

      const sessionContext = {
        previousTopics,
        previousDistortions,
        previousQuestions,
        previousReframes,
        previousAcknowledgments,
        previousEncouragements,
        originalTrigger,
        sessionCount: sessions.length + 1,
        groundingMode,
        groundingTurns,
        lastQuestionType,
        userIntent,
        coreBeliefAlreadyDetected,
      };

      const response = await fetch('/api/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userMessage: trimmed,
          conversationHistory,
          sessionContext,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data: ReframeResponse = await response.json();

      console.log('🤖 AI Provider:', (data as Record<string, unknown>)._meta?.provider || 'unknown');
      console.log('📝 Model:', (data as Record<string, unknown>)._meta?.model || 'unknown');

      if (requestSeqRef.current !== reqId) return;

      if ((data as any)?._meta?.coreBeliefDetected === true) {
        setCoreBeliefAlreadyDetected(true);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.acknowledgment || 'Thank you for sharing.',
        question: (data.question || data.probingQuestion || '').trim(),
        thoughtPattern: (data.thoughtPattern || data.distortionType) as any,
        patternNote: (data.patternNote || data.distortionExplanation) as any,
        reframe: (data.reframe || '').trim(),
        encouragement: (data.encouragement || '').trim(),
        icebergLayer: data.icebergLayer,
        layerInsight: data.layerInsight,
        distortionType: data.distortionType,
        distortionExplanation: data.distortionExplanation,
        probingQuestion: data.probingQuestion,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (typeof data.groundingMode === 'boolean') {
        setGroundingMode(data.groundingMode);
        setGroundingTurns(data.groundingTurns || 0);
      }

      const currentQ = (data.question || data.probingQuestion || '').trim();
      if (currentQ) {
        const isChoiceQ = currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding');
        setLastQuestionType(isChoiceQ ? 'choice' : 'open');
      }

      // Save messages + session state
      if (isSignedIn && activeSessionId) {
        // Only save user message if this is NOT the first message (first is saved in createSession)
        if (messages.length > 0) {
          await saveMessage(activeSessionId, userMessage);
        }
        await saveMessage(activeSessionId, assistantMessage);

        await fetch(`/api/sessions/${activeSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentLayer: data.icebergLayer || 'surface',
            coreBelief: data.icebergLayer === 'coreBelief' ? data.layerInsight : undefined,
            coreBeliefAlreadyDetected: coreBeliefAlreadyDetected || (data as any)?._meta?.coreBeliefDetected === true,
            lastQuestionType: currentQ
              ? (currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding') ? 'choice' : 'open')
              : lastQuestionType,
            groundingMode: typeof data.groundingMode === 'boolean' ? data.groundingMode : groundingMode,
            groundingTurns: typeof data.groundingTurns === 'number' ? data.groundingTurns : groundingTurns,
            lastIntentUsed: userIntent,
          }),
        });

        await loadSessions();
      }

      setCurrentLayer(data.icebergLayer || 'surface');
      setDiscoveredInsights((prev) => ({
        ...prev,
        [data.icebergLayer || 'surface']: data.layerInsight || null,
      }));

      if (typeof data.progressScore === 'number') setProgressScore(data.progressScore);
      if (data.layerProgress) setLayerProgress(data.layerProgress);
      if (data.progressNote) setProgressNote(data.progressNote);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error('Error:', error);

      if (requestSeqRef.current !== reqId) return;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I ran into an issue: ${error instanceof Error ? error.message : 'Unknown error'}. Try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestSeqRef.current === reqId) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  };

  const handleReset = () => {
    setUserIntent('AUTO');
    setMessages([]);
    setCurrentLayer('surface');
    setDiscoveredInsights({
      surface: null,
      trigger: null,
      emotion: null,
      coreBelief: null,
    });
    setProgressScore(0);
    setLayerProgress({
      surface: 0,
      trigger: 0,
      emotion: 0,
      coreBelief: 0,
    });
    setProgressNote('');
    setSessionStarted(false);
    setShowSummary(false);
    setCurrentSessionId(null);
    setGroundingMode(false);
    setGroundingTurns(0);
    setLastQuestionType('');
    setCoreBeliefAlreadyDetected(false);
    setEditingMessageId(null);
    setEditContent('');
    if (isSignedIn) {
      loadSessions();
    }
  };

  const handleEditStart = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditSave = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const newContent = editContent.trim();

    const messageIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (messageIndex === -1) return;

    abortRef.current?.abort();
    inFlightRef.current = false;

    const truncatedMessages = messages.slice(0, messageIndex + 1).map((m, idx) => {
      if (idx === messageIndex) {
        return { ...m, content: newContent };
      }
      return m;
    });

    const userMessageIndex = truncatedMessages.findIndex((m) => m.id === editingMessageId);
    const messagesAfterEdit = truncatedMessages.slice(0, userMessageIndex + 1);

    setEditingMessageId(null);
    setEditContent('');

    setMessages(messagesAfterEdit);
    setIsLoading(true);

    const reqId = ++requestSeqRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    const activeSessionId = currentSessionId;

    try {
      const conversationHistory = messagesAfterEdit.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.content : assistantHistoryContent(m),
      }));

      const previousTopics = sessions
        .slice(0, 5)
        .map((s) => s.title)
        .filter(Boolean) as string[];

      const previousDistortions = sessions
        .slice(0, 5)
        .flatMap((s) => (s.messages?.map((m) => m.distortionType).filter(Boolean) as string[]) || [])
        .filter(Boolean);

      const previousQuestions = messagesAfterEdit
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.question || m.probingQuestion || '').trim())
        .filter(Boolean) as string[];

      const previousReframes = messagesAfterEdit
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.reframe || '').trim())
        .filter(Boolean) as string[];

      const previousAcknowledgments = messagesAfterEdit
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.content || '').trim())
        .filter(Boolean) as string[];

      const previousEncouragements = messagesAfterEdit
        .filter((m) => m.role === 'assistant')
        .map((m) => (m.encouragement || '').trim())
        .filter(Boolean) as string[];

      const originalTrigger = messagesAfterEdit.find((m) => m.role === 'user')?.content || '';

      const sessionContext = {
        previousTopics,
        previousDistortions,
        previousQuestions,
        previousReframes,
        previousAcknowledgments,
        previousEncouragements,
        originalTrigger,
        sessionCount: sessions.length + 1,
        groundingMode,
        groundingTurns,
        lastQuestionType,
        userIntent,
        coreBeliefAlreadyDetected,
      };

      const response = await fetch('/api/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userMessage: newContent,
          conversationHistory,
          sessionContext,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data: ReframeResponse = await response.json();

      if (requestSeqRef.current !== reqId) return;

      if ((data as any)?._meta?.coreBeliefDetected === true) {
        setCoreBeliefAlreadyDetected(true);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.acknowledgment || 'Thank you for sharing.',
        question: (data.question || data.probingQuestion || '').trim(),
        thoughtPattern: (data.thoughtPattern || data.distortionType) as any,
        patternNote: (data.patternNote || data.distortionExplanation) as any,
        reframe: (data.reframe || '').trim(),
        encouragement: (data.encouragement || '').trim(),
        icebergLayer: data.icebergLayer,
        layerInsight: data.layerInsight,
        distortionType: data.distortionType,
        distortionExplanation: data.distortionExplanation,
        probingQuestion: data.probingQuestion,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (typeof data.groundingMode === 'boolean') {
        setGroundingMode(data.groundingMode);
        setGroundingTurns(data.groundingTurns || 0);
      }

      const currentQ = (data.question || data.probingQuestion || '').trim();
      if (currentQ) {
        const isChoiceQ = currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding');
        setLastQuestionType(isChoiceQ ? 'choice' : 'open');
      }

      setCurrentLayer(data.icebergLayer || 'surface');
      setDiscoveredInsights((prev) => ({
        ...prev,
        [data.icebergLayer || 'surface']: data.layerInsight || null,
      }));

      if (typeof data.progressScore === 'number') setProgressScore(data.progressScore);
      if (data.layerProgress) setLayerProgress(data.layerProgress);

      if (isSignedIn && activeSessionId) {
        await fetch(`/api/sessions/${activeSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentLayer: data.icebergLayer || 'surface',
            coreBeliefAlreadyDetected: coreBeliefAlreadyDetected || (data as any)?._meta?.coreBeliefDetected === true,
            lastQuestionType: currentQ
              ? (currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding') ? 'choice' : 'open')
              : lastQuestionType,
            groundingMode: typeof data.groundingMode === 'boolean' ? data.groundingMode : groundingMode,
            groundingTurns: typeof data.groundingTurns === 'number' ? data.groundingTurns : groundingTurns,
            lastIntentUsed: userIntent,
          }),
        });

        await loadSessions();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error:', error);
      if (requestSeqRef.current !== reqId) return;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I ran into an issue: ${error instanceof Error ? error.message : 'Unknown error'}. Try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestSeqRef.current === reqId) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  };

  const loadSession = async (sessionId: string) => {
    console.log('🔵 loadSession called with ID:', sessionId);

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();

      console.log('🟢 API response session ID:', data.session?.id);
      console.log('🟢 API response messages count:', data.session?.messages?.length);
      console.log('🟢 First message content:', data.session?.messages?.[0]?.content?.slice(0, 50));

      if (data.session) {
        const normalizedMessages = normalizeLoadedMessages(data.session.messages || []);

        setMessages(normalizedMessages);
        setCurrentLayer(data.session.currentLayer as IcebergLayer);
        setCurrentSessionId(sessionId);
        setSessionStarted(true);
        setShowHistory(false);

        if (typeof data.session.coreBeliefAlreadyDetected === 'boolean') {
          setCoreBeliefAlreadyDetected(data.session.coreBeliefAlreadyDetected);
        } else if (data.session.coreBelief) {
          setCoreBeliefAlreadyDetected(true);
        }

        if (typeof data.session.groundingMode === 'boolean') setGroundingMode(data.session.groundingMode);
        if (typeof data.session.groundingTurns === 'number') setGroundingTurns(data.session.groundingTurns);
        if (typeof data.session.lastQuestionType === 'string') setLastQuestionType(data.session.lastQuestionType);

        const insights: Record<IcebergLayer, string | null> = {
          surface: null,
          trigger: null,
          emotion: null,
          coreBelief: data.session.coreBelief,
        };

        normalizedMessages.forEach((msg: Message) => {
          if (msg.icebergLayer && msg.layerInsight) {
            insights[msg.icebergLayer as IcebergLayer] = msg.layerInsight;
          }
        });
        setDiscoveredInsights(insights);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session? This cannot be undone.')) return;

    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleReset();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const toggleSelect = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} session${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;

    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/sessions/${id}`, { method: 'DELETE' })));
      setSessions(sessions.filter((s) => !selectedIds.has(s.id)));
      if (currentSessionId && selectedIds.has(currentSessionId)) {
        handleReset();
      }
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Error deleting sessions:', error);
    }
  };

  const exportSession = () => {
    const content = messages
      .map((m) => {
        let text = `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`;
        if (m.distortionType) text += `\nDistortion: ${m.distortionType}`;
        if (m.reframe) text += `\nReframe: ${m.reframe}`;
        return text;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimism-session-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Mobile Header - Sign in via Profile page */}
      <MobileHeader
        title="Reflect"
        subtitle="Understand your thoughts"
        icon="heart"
        onToggleDark={toggleDark}
        isDark={isDark}
        rightAction={
          isSignedIn ? (
            <div className="flex items-center gap-1">
              {sessions.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary transition-all"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : null
        }
      />

      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hide-on-mobile">
        <div className="glass border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 rounded-xl hover:bg-secondary/80 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Reflect</h1>
                  <p className="text-xs text-muted-foreground">Understand your thoughts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
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
                {isSignedIn ? (
                  <>
                    <Link href="/lab" className="text-sm font-medium text-accent hover:text-accent/80 transition-colors px-3 py-2 hidden sm:block rounded-lg hover:bg-accent/10">The Lab →</Link>
                    <Link href="/progress">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Progress
                      </Button>
                    </Link>
                    {sessions.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-muted-foreground hover:text-foreground">
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    )}
                    {sessionStarted && (
                      <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        New
                      </Button>
                    )}
                    <UserButton afterSignOutUrl="/" />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <Button variant="ghost" size="sm">Sign In</Button>
                    </SignInButton>
                    <SignInButton mode="modal">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">Save Progress</Button>
                    </SignInButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Session History Sidebar - Desktop */}
      <AnimatePresence>
        {showHistory && isSignedIn && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed left-0 top-[73px] bottom-0 w-80 glass border-r border-border/50 z-40 overflow-y-auto hide-on-mobile"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Session History</h2>
                {!selectMode && sessions.length > 0 && (
                  <button onClick={() => setSelectMode(true)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select
                  </button>
                )}
                {selectMode && (
                  <div className="flex items-center gap-2">
                    <button onClick={selectAll} className="text-xs text-primary hover:text-primary/80">All</button>
                    <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {selectMode && selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="w-full mb-4 py-2.5 px-4 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedIds.size})
                </button>
              )}

              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      console.log('🖱️ Clicked session:', session.id, 'Title:', session.title);
                      if (!selectMode) loadSession(session.id);
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative group",
                      selectedIds.has(session.id)
                        ? 'border-primary bg-primary/5'
                        : currentSessionId === session.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/30 hover:bg-secondary/50'
                    )}
                  >
                    {selectMode ? (
                      <button onClick={(e) => toggleSelect(session.id, e)} className="absolute top-3 right-3 text-primary">
                        {selectedIds.has(session.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-muted-foreground/30" />}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="absolute top-2 right-2 p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <p className="text-sm font-medium text-foreground truncate pr-8">{session.title || 'Untitled Session'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </p>
                    {session.coreBelief && <p className="text-xs text-primary mt-1 truncate">Core belief: {session.coreBelief}</p>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session History Panel - Mobile (Full screen overlay) */}
      <AnimatePresence>
        {showHistory && isSignedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-xl"
              onClick={() => setShowHistory(false)}
            />
            
            {/* Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 top-0 bottom-0 bg-background pt-safe"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 glass border-b border-border/50">
                <div className="flex items-center justify-between h-14 px-4">
                  <h2 className="text-lg font-semibold text-foreground">Session History</h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Sessions list */}
              <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-56px)] pb-mobile">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      loadSession(session.id);
                      setShowHistory(false);
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.98]",
                      currentSessionId === session.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/30 bg-card'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{session.title || 'Untitled Session'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </p>
                    {session.coreBelief && (
                      <p className="text-xs text-primary mt-1 truncate">Core belief: {session.coreBelief}</p>
                    )}
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No sessions yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Start a reflection to see your history</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-mobile">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {!sessionStarted && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center py-16">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: 'loop' }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-premium">
                    <Sparkles className="w-10 h-10 text-primary-foreground" />
                  </div>
                </motion.div>

                <h2 className="text-display text-center mb-4">
                  <span className="gradient-text">What&apos;s on your mind?</span>
                </h2>

                <p className="text-muted-foreground text-center max-w-lg mb-8 text-lg">
                  Share a thought that&apos;s been weighing on you. Let&apos;s explore it together - surface, trigger, emotion, and the core belief beneath.
                </p>

                {!isSignedIn && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl border border-primary/30 p-6 mb-6 max-w-md text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium mb-2">
                      Sign in to save your progress
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your sessions won&apos;t be saved unless you sign in. Track your journey and revisit past reflections.
                    </p>
                    <SignInButton mode="modal">
                      <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-premium">
                        Sign In to Save Sessions
                      </button>
                    </SignInButton>
                  </motion.div>
                )}
              </motion.div>
            )}

            {sessionStarted && (
              <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-h-[calc(100vh-300px)]">
                {/* Warning banner for non-signed-in users */}
                {!isSignedIn && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-0 z-10 glass rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3"
                  >
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Sign in to save this session
                    </p>
                    <SignInButton mode="modal">
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                        Sign In
                      </button>
                    </SignInButton>
                  </motion.div>
                )}
                
                <AnimatePresence>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onEdit={handleEditStart}
                      isEditing={editingMessageId === message.id}
                      editContent={editContent}
                      onEditChange={setEditContent}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                    />
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center animate-pulse shadow-premium">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input Area */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">Mode</span>
                <select
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value as UserIntent)}
                  disabled={isLoading || isSaving}
                  className="text-xs border border-border bg-card rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="AUTO">AUTO</option>
                  <option value="CALM">CALM</option>
                  <option value="CLARITY">CLARITY</option>
                  <option value="NEXT_STEP">NEXT_STEP</option>
                  <option value="MEANING">MEANING</option>
                  <option value="LISTEN">LISTEN</option>
                </select>
              </div>

              <ThoughtInput
                onSubmit={handleSubmit}
                isLoading={isLoading || isSaving}
                placeholder={
                  messages.length === 0
                    ? "What's on your mind? Share a thought that's been troubling you..."
                    : 'Continue your reflection...'
                }
              />
            </div>

            {sessionStarted && messages.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={exportSession} className="text-muted-foreground hover:text-foreground">
                  <Download className="w-4 h-4 mr-1" />
                  Export Session
                </Button>
              </div>
            )}
          </div>

          {/* Iceberg Visualization - Desktop */}
          {sessionStarted && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24">
                <div className="glass rounded-2xl border border-border/50 shadow-premium p-5">
                  <IcebergVisualization currentLayer={currentLayer} discoveredInsights={discoveredInsights} />
                </div>
              </div>
            </div>
          )}

          {/* Draggable Journey Bubble - Mobile */}
          {sessionStarted && (
            <DraggableBubble currentLayer={currentLayer} discoveredInsights={discoveredInsights} />
          )}
        </div>
      </main>

      {/* Footer - Desktop only */}
      <footer className="relative z-10 py-6 px-6 border-t border-border/50 mt-8 hide-on-mobile">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
