'use client';

import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { IcebergVisualization, IcebergLayer } from '@/components/IcebergVisualization';
import { DraggableBubble } from '@/components/DraggableBubble';
import { ThoughtInput } from '@/components/ThoughtInput';
import { Button } from '@/components/ui/button';

type UserIntent = 'AUTO' | 'CALM' | 'CLARITY' | 'NEXT_STEP' | 'MEANING' | 'LISTEN';

interface ReframeResponse {
  acknowledgment: string;
  // New Iceberg layer fields
  surface?: string;
  trigger?: string;
  emotion?: string;
  coreBelief?: string;
  question?: string;

  // Legacy fields (kept for backward compatibility)
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

// ------------------------------
// Helpers: parse assistant JSON content saved in DB
// ------------------------------
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
      // ✅ show human text in UI
      content: acknowledgment,

      // ✅ hydrate structured fields
      question: ((parsed.question ?? parsed.probingQuestion ?? m.question ?? m.probingQuestion ?? '') as string).trim(),
      thoughtPattern: (parsed.thoughtPattern ?? parsed.distortionType ?? m.thoughtPattern ?? m.distortionType) as any,
      patternNote: (parsed.patternNote ?? parsed.distortionExplanation ?? m.patternNote ?? m.distortionExplanation) as any,
      reframe: ((parsed.reframe ?? m.reframe ?? '') as string).trim(),
      encouragement: ((parsed.encouragement ?? m.encouragement ?? '') as string).trim(),
      icebergLayer: (parsed.icebergLayer ?? m.icebergLayer) as any,
      layerInsight: (parsed.layerInsight ?? m.layerInsight) as any,

      // back-compat
      distortionType: (parsed.distortionType ?? m.distortionType) as any,
      distortionExplanation: (parsed.distortionExplanation ?? m.distortionExplanation) as any,
      probingQuestion: (parsed.probingQuestion ?? m.probingQuestion) as any,
    } as Message;
  });
}

function assistantHistoryContent(m: Message) {
  // ✅ Ensure assistant history content is JSON parseable (reframe/route.ts hydrates memory from JSON)
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

  // ✅ Hard guard refs: prevent double-submit + abort stale requests
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isSignedIn) {
      loadSessions();
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (currentLayer === 'coreBelief' && discoveredInsights.coreBelief && currentSessionId) {
      updateSessionComplete();
    }
  }, [currentLayer, discoveredInsights.coreBelief, currentSessionId]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();

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
      const data = await res.json();
      return data.session?.id || null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessage = async (message: Omit<Message, 'id'>) => {
    if (!currentSessionId) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, sessionId: currentSessionId }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateSessionComplete = async () => {
    if (!currentSessionId) return;
    try {
      await fetch(`/api/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLayer: 'coreBelief',
          coreBelief: discoveredInsights.coreBelief,
          isCompleted: true,
          // ✅ session-state memory
          coreBeliefAlreadyDetected: true,
          lastQuestionType,
          groundingMode,
          groundingTurns,
          lastIntentUsed: userIntent,
          lastUpdatedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const handleSubmit = async (thought: string) => {
    const trimmed = thought.trim();
    if (!trimmed) return;

    // ✅ Hard guard: prevents double-submit (Enter spam / click + Enter)
    if (inFlightRef.current) return;

    // ✅ Mark in-flight immediately (ref is synchronous)
    inFlightRef.current = true;

    // ✅ Cancel any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ✅ Only the latest request is allowed to append assistant output
    const reqId = ++requestSeqRef.current;

    // Start session if first message
    if (!sessionStarted) {
        setSessionStarted(true);
      
        if (isSignedIn) {
          setIsSaving(true);
          const sessionId = await createSession(trimmed);
          if (sessionId) setCurrentSessionId(sessionId);
          setIsSaving(false);
        }
}

    // Build user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };

    // ✅ Snapshot messages INCLUDING this new user message (avoids stale state bugs)
    const nextMessages = [...messages, userMessage];

    // Render immediately
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      // ✅ Build conversationHistory from nextMessages (assistant content MUST be JSON)
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

      // ✅ Pull previous questions/reframes/ack/enc from nextMessages
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
        // ✅ NEW
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

      // ✅ Debug: Log which AI provider is being used
      console.log('🤖 AI Provider:', (data as Record<string, unknown>)._meta?.provider || 'unknown');
      console.log('📝 Model:', (data as Record<string, unknown>)._meta?.model || 'unknown');

      // ✅ If another request started after this one, don't append anything
      if (requestSeqRef.current !== reqId) return;

      // ✅ If core belief detected, latch flag
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

      // ✅ Track grounding mode from API response
      if (typeof data.groundingMode === 'boolean') {
        setGroundingMode(data.groundingMode);
        setGroundingTurns(data.groundingTurns || 0);
      }

      // ✅ Track last question type (use existing heuristic)
      const currentQ = (data.question || data.probingQuestion || '').trim();
      if (currentQ) {
        const isChoiceQ =
          currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding');
        setLastQuestionType(isChoiceQ ? 'choice' : 'open');
      }

      if (isSignedIn && currentSessionId) {
        await saveMessage(userMessage);
        await saveMessage(assistantMessage);

        // ✅ persist session engine state every turn (cheap + keeps engine “product-grade”)
        await fetch(`/api/sessions/${currentSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentLayer: data.icebergLayer || 'surface',
            coreBelief: (data.icebergLayer === 'coreBelief' ? data.layerInsight : undefined) ?? undefined,
            coreBeliefAlreadyDetected: coreBeliefAlreadyDetected || (data as any)?._meta?.coreBeliefDetected === true,
            lastQuestionType: currentQ ? (currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding') ? 'choice' : 'open') : lastQuestionType,
            groundingMode: typeof data.groundingMode === 'boolean' ? data.groundingMode : groundingMode,
            groundingTurns: typeof data.groundingTurns === 'number' ? data.groundingTurns : groundingTurns,
            lastIntentUsed: userIntent,
            lastUpdatedAt: new Date().toISOString(),
          }),
        });
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
      // ✅ Ignore aborts (happens when user sends again quickly)
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error('Error:', error);

      // ✅ Only append error if this request is still the latest
      if (requestSeqRef.current !== reqId) return;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I ran into an issue: ${error instanceof Error ? error.message : 'Unknown error'}. Try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // ✅ Only the latest request controls loading state
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

  // ✅ EDIT MESSAGE: Start editing
  const handleEditStart = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  // ✅ EDIT MESSAGE: Cancel editing
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // ✅ EDIT MESSAGE: Save and resend
  const handleEditSave = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const newContent = editContent.trim();

    // Find the message index
    const messageIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    inFlightRef.current = false;

    // Truncate messages to only include messages before and including the edited one
    // Then update the edited message's content
    const truncatedMessages = messages.slice(0, messageIndex + 1).map((m, idx) => {
      if (idx === messageIndex) {
        return { ...m, content: newContent };
      }
      return m;
    });

    // Remove the assistant response that followed the edited user message
    const userMessageIndex = truncatedMessages.findIndex((m) => m.id === editingMessageId);
    const messagesAfterEdit = truncatedMessages.slice(0, userMessageIndex + 1);

    // Clear edit state
    setEditingMessageId(null);
    setEditContent('');

    // Update messages
    setMessages(messagesAfterEdit);
    setIsLoading(true);

    // Increment request sequence
    const reqId = ++requestSeqRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    try {
      // ✅ Build conversationHistory (assistant content MUST be JSON)
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
        // ✅ NEW
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

      // Check if this request is still the latest
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
        const isChoiceQ =
          currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding');
        setLastQuestionType(isChoiceQ ? 'choice' : 'open');
      }

      setCurrentLayer(data.icebergLayer || 'surface');
      setDiscoveredInsights((prev) => ({
        ...prev,
        [data.icebergLayer || 'surface']: data.layerInsight || null,
      }));

      if (typeof data.progressScore === 'number') setProgressScore(data.progressScore);
      if (data.layerProgress) setLayerProgress(data.layerProgress);

      // ✅ persist session state on edit replay too
      if (isSignedIn && currentSessionId) {
        await fetch(`/api/sessions/${currentSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentLayer: data.icebergLayer || 'surface',
            coreBeliefAlreadyDetected: coreBeliefAlreadyDetected || (data as any)?._meta?.coreBeliefDetected === true,
            lastQuestionType: currentQ ? (currentQ.toLowerCase().includes('explore') && currentQ.toLowerCase().includes('grounding') ? 'choice' : 'open') : lastQuestionType,
            groundingMode: typeof data.groundingMode === 'boolean' ? data.groundingMode : groundingMode,
            groundingTurns: typeof data.groundingTurns === 'number' ? data.groundingTurns : groundingTurns,
            lastIntentUsed: userIntent,
            lastUpdatedAt: new Date().toISOString(),
          }),
        });
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
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (data.session) {
        const normalizedMessages = normalizeLoadedMessages(data.session.messages || []);

        setMessages(normalizedMessages);
        setCurrentLayer(data.session.currentLayer as IcebergLayer);
        setCurrentSessionId(sessionId);
        setSessionStarted(true);
        setShowHistory(false);

        // ✅ hydrate session state if your sessions/[id] endpoint returns these fields
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
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
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
    if (
      !confirm(
        `Delete ${selectedIds.size} session${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`
      )
    )
      return;

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-10 h-10 relative">
                <img src="/logo.svg" alt="Optimism Engine Logo" className="w-full h-full rounded-xl shadow-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Reflect
                </h1>
                <p className="text-xs text-gray-500">Understand your thoughts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <Link
                    href="/assist"
                    className="text-sm text-teal-600 hover:text-teal-700 transition-colors mr-2"
                  >
                    Switch to Assist →
                  </Link>
                  <Link href="/progress">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Progress
                    </Button>
                  </Link>
                  {sessions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                  )}
                  {sessionStarted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      New
                    </Button>
                  )}
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
                    >
                      Save Progress
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Session History Sidebar */}
      <AnimatePresence>
        {showHistory && isSignedIn && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed left-0 top-16 bottom-0 w-80 bg-white/95 backdrop-blur-lg border-r border-blue-100 z-40 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Session History</h2>
                {!selectMode && sessions.length > 0 && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select
                  </button>
                )}
                {selectMode && (
                  <div className="flex items-center gap-2">
                    <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700">
                      All
                    </button>
                    <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {selectMode && selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="w-full mb-3 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedIds.size})
                </button>
              )}

              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => !selectMode && loadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative group ${
                      selectedIds.has(session.id)
                        ? 'border-blue-500 bg-blue-50'
                        : currentSessionId === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    {selectMode ? (
                      <button onClick={(e) => toggleSelect(session.id, e)} className="absolute top-3 right-3 text-blue-600">
                        {selectedIds.has(session.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <p className="text-sm font-medium text-gray-800 truncate pr-8">{session.title || 'Untitled Session'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </p>
                    {session.coreBelief && (
                      <p className="text-xs text-blue-600 mt-1 truncate">Core belief: {session.coreBelief}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Welcome State */}
            {!sessionStarted && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: 'loop' }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 relative">
                    <img src="/logo.svg" alt="Optimism Engine" className="w-full h-full rounded-3xl shadow-2xl" />
                  </div>
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
                    What&apos;s on your mind?
                  </span>
                </h2>

                <p className="text-gray-600 text-center max-w-md mb-8 text-lg">
                  Share a thought that&apos;s been weighing on you. Let&apos;s explore it together - surface, trigger, emotion, and the core belief beneath.
                </p>

                {!isSignedIn && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md">
                    <p className="text-sm text-blue-700">
                      <strong>Sign in</strong> to save your sessions and track your progress over time!
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Messages */}
            {sessionStarted && (
              <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-h-[calc(100vh-300px)]">
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

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-4">
                    <div className="w-10 h-10">
                      <img src="/logo.svg" alt="" className="w-full h-full rounded-full animate-pulse" />
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-blue-400"
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
            <div className="mt-4 space-y-2">
              {/* Reflect-only Intent Selector */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-gray-500">Mode</span>
                <select
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value as UserIntent)}
                  disabled={isLoading || isSaving}
                  className="text-xs border border-gray-200 bg-white/80 rounded-lg px-2 py-1 shadow-sm"
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

            {/* Export Button */}
            {sessionStarted && messages.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={exportSession} className="text-gray-500 hover:text-gray-700">
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
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-lg p-4">
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-16 pointer-events-none" />

      {/* Disclaimer */}
      <div className="fixed bottom-2 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-gray-400">Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.</p>
      </div>
    </div>
  );
}
