// src/lib/engine/runEngine.ts
import {
  checkCrisisKeywords,
  generateCrisisResponse,
  SEVERITY_LEVELS,
} from '@/lib/crisis-detection';
import { callAI, type AIMessage } from '@/lib/ai-service';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type UserIntent = 'AUTO' | 'CALM' | 'CLARITY' | 'NEXT_STEP' | 'MEANING' | 'LISTEN';

export interface SessionContext {
  previousTopics?: string[];
  previousDistortions?: string[];
  sessionCount?: number;

  previousQuestions?: string[];
  previousReframes?: string[];

  // ✅ NEW (optional, backwards-compatible):
  previousAcknowledgments?: string[];
  previousEncouragements?: string[];

  originalTrigger?: string;
  coreBeliefAlreadyDetected?: boolean;
  groundingMode?: boolean;
  groundingTurns?: number;
  lastQuestionType?: 'choice' | 'open' | '';
  userIntent?: UserIntent; // Reflect-only intent router (set by UI)

  // optional: vendor meta
  meta?: Record<string, unknown>;
}

interface AnalysisResult {
  trigger_event: string;
  likely_interpretation: string;
  underlying_fear: string;
  emotional_need: string;
  core_wound?: string;
}

type EffectiveLayer = 'SURFACE' | 'TRANSITION' | 'EMOTION' | 'CORE_WOUND';

// ============================================================================
// HYBRID ENGINE (Deterministic cognitive router)
// ============================================================================

type CognitiveState = 'REGULATE' | 'CLARIFY' | 'MAP' | 'RESTRUCTURE' | 'PLAN' | 'PRESENCE';
type Intervention =
  | 'GROUND'
  | 'SEPARATE_FACTS'
  | 'REFLECT_MAP'
  | 'CBT_REFRAME'
  | 'TINY_PLAN'
  | 'VALIDATE_ONLY';

interface EngineDecision {
  state: CognitiveState;
  intervention: Intervention;
  confidence: number; // 0..1
  reasons: string[];
  askQuestion: boolean;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function detectThanksOrResolution(text: string): boolean {
  const s = (text || '').toLowerCase();
  return (
    s.includes('thanks') ||
    s.includes('thank you') ||
    s.includes('i feel better') ||
    s.includes('feeling better') ||
    s.includes('a little better') ||
    s.includes('ok now') ||
    s.includes("i’m okay") ||
    s.includes("i'm okay") ||
    s.includes('that helped') ||
    s.includes('this helped')
  );
}

function detectActionRequest(text: string): boolean {
  const s = (text || '').toLowerCase();
  return (
    s.includes('what should i do') ||
    s.includes('what do i do') ||
    s.includes('next step') ||
    s.includes('how do i') ||
    s.includes('help me') ||
    s.includes('plan') ||
    s.includes('steps') ||
    s.includes('what now')
  );
}

function detectHighArousal(text: string): number {
  const s = (text || '').toLowerCase();
  const markers = [
    'panic',
    'panicking',
    'super anxious',
    'very anxious',
    'anxious',
    "can't breathe",
    'cant breathe',
    'heart racing',
    'overwhelmed',
    'all-consuming',
    'spiraling',
    "i can't handle",
    'i cant handle',
    'i feel sick',
    'terrified',
    'scared',
    'shaking',
  ];
  let score = 0;
  for (const m of markers) if (s.includes(m)) score += 1;
  if ((text.match(/!/g) || []).length >= 2) score += 0.5;
  if (text.length > 180 && (s.includes('everything') || s.includes('nothing'))) score += 0.5;
  return clamp01(score / 3);
}

function detectDistortionLikelihood(text: string): number {
  let score = 0;
  if (/\b(always|never|everyone|no one|nothing|everything)\b/i.test(text)) score += 0.4;
  if (/\b(worst|ruin|disaster|fired|hopeless|pointless)\b/i.test(text)) score += 0.4;
  if (/\b(should|must|have to)\b/i.test(text)) score += 0.25;
  if (/\b(they think|they’ll think|they will think)\b/i.test(text)) score += 0.25;
  return clamp01(score);
}

function userSeemsFlooded(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  const floodIndicators = [
    "i don't know",
    'dont know',
    "can't recall",
    'cant recall',
    "can't pinpoint",
    'cant pinpoint',
    'not sure',
    'idk',
    'whatever',
    'nothing',
    'blank',
    'mind is blank',
    "i can't think",
    'too much',
    'overwhelmed',
  ];
  return floodIndicators.some(p => s.includes(p));
}

function decideEngineState(
  userText: string,
  analysis: AnalysisResult,
  intent: UserIntent,
  groundingMode: boolean
): EngineDecision {
  const reasons: string[] = [];

  // intent overrides (but groundingMode still wins)
  if (groundingMode || intent === 'CALM') {
    return {
      state: 'REGULATE',
      intervention: 'GROUND',
      confidence: 0.85,
      reasons: ['groundingMode or intent=CALM'],
      askQuestion: false,
    };
  }

  if (intent === 'LISTEN') {
    return {
      state: 'PRESENCE',
      intervention: 'VALIDATE_ONLY',
      confidence: 0.85,
      reasons: ['intent=LISTEN'],
      askQuestion: false,
    };
  }

  if (detectThanksOrResolution(userText)) {
    return {
      state: 'PRESENCE',
      intervention: 'VALIDATE_ONLY',
      confidence: 0.75,
      reasons: ['user signaled relief/resolution'],
      askQuestion: false,
    };
  }

  const highArousal = detectHighArousal(userText);
  const flooded = userSeemsFlooded(userText);

  if (highArousal >= 0.6 || flooded) {
    reasons.push(`highArousal=${highArousal.toFixed(2)}`, `flooded=${String(flooded)}`);
    return {
      state: 'REGULATE',
      intervention: 'GROUND',
      confidence: 0.8,
      reasons,
      askQuestion: false,
    };
  }

  const actionReq = detectActionRequest(userText);
  if (intent === 'NEXT_STEP' || actionReq) {
    return {
      state: 'PLAN',
      intervention: 'TINY_PLAN',
      confidence: 0.75,
      reasons: ['intent=NEXT_STEP or action request'],
      askQuestion: true,
    };
  }

  if (intent === 'CLARITY') {
    return {
      state: 'CLARIFY',
      intervention: 'SEPARATE_FACTS',
      confidence: 0.8,
      reasons: ['intent=CLARITY'],
      askQuestion: true,
    };
  }

  if (intent === 'MEANING') {
    return {
      state: 'MAP',
      intervention: 'REFLECT_MAP',
      confidence: 0.75,
      reasons: ['intent=MEANING'],
      askQuestion: true,
    };
  }

  // AUTO
  const distortionLikely = detectDistortionLikelihood(userText);
  if (distortionLikely >= 0.6) {
    return {
      state: 'RESTRUCTURE',
      intervention: 'CBT_REFRAME',
      confidence: 0.7,
      reasons: [`distortionLikely=${distortionLikely.toFixed(2)}`],
      askQuestion: true,
    };
  }

  // default MAP
  return {
    state: 'MAP',
    intervention: 'REFLECT_MAP',
    confidence: 0.65,
    reasons: [`distortionLikely=${distortionLikely.toFixed(2)} -> MAP`],
    askQuestion: true,
  };
}

// ============================================================================
// Normalize for comparison
// ============================================================================

function normalizeForCompare(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripCandidatePrefixes(s: string): string {
  return (s || '')
    .replace(/^\s*(candidate\s*#?\d+[:\-]?\s*)/i, '')
    .replace(/^\s*(option\s*[a-z]\s*[:\-]?\s*)/i, '')
    .replace(/^\s*\d+[\).\-\:]\s*/, '')
    .trim();
}

// ============================================================================
// Hard Block Exact Repetition (questions + reframes + pattern notes + ack/enc)
// ============================================================================

function isDuplicateReframe(reframe: string, previousReframes: string[]): boolean {
  const cur = normalizeForCompare(reframe);
  return previousReframes.map(normalizeForCompare).some(prev => prev === cur);
}

function isDuplicateQuestion(question: string, previousQuestions: string[]): boolean {
  const cur = normalizeForCompare(question);
  return previousQuestions.map(normalizeForCompare).some(prev => prev === cur);
}

function isDuplicatePatternNote(note: string, previousNotes: string[]): boolean {
  const cur = normalizeForCompare(note);
  return previousNotes.map(normalizeForCompare).some(prev => prev === cur);
}

function isDuplicateAck(a: string, previous: string[]): boolean {
  const cur = normalizeForCompare(a);
  return previous.map(normalizeForCompare).some(prev => prev === cur);
}

function isDuplicateEnc(e: string, previous: string[]): boolean {
  const cur = normalizeForCompare(e);
  return previous.map(normalizeForCompare).some(prev => prev === cur);
}

// ============================================================================
// Near-duplicate detection (Jaccard overlap) to stop paraphrase repeats
// ============================================================================

function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function jaccardSimilarity(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;

  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function isNearDuplicateText(cur: string, previous: string[], threshold = 0.62): boolean {
  const c = normalizeForCompare(cur);
  return previous.some(p => jaccardSimilarity(c, normalizeForCompare(p)) >= threshold);
}

// ============================================================================
// Intent Router (Reflect-only)
// ============================================================================

function resolveIntent(sessionContext?: SessionContext): UserIntent {
  const i = sessionContext?.userIntent;
  if (!i) return 'AUTO';
  if (['AUTO', 'CALM', 'CLARITY', 'NEXT_STEP', 'MEANING', 'LISTEN'].includes(i)) return i;
  return 'AUTO';
}

function intentGuidance(intent: UserIntent): string {
  switch (intent) {
    case 'CALM':
      return `INTENT: CALM
- Prioritize grounding + nervous-system settling.
- Short, concrete, present-tense.
- Avoid cognitive labels unless the user explicitly asks.
- Question optional.`;

    case 'CLARITY':
      return `INTENT: CLARITY
- Separate facts vs story.
- If a distortion isn't clearly present, leave thoughtPattern empty.
- Offer one clean reframe. One question max.`;

    case 'NEXT_STEP':
      return `INTENT: NEXT_STEP
- Convert overwhelm into a tiny plan (1–3 steps).
- Practical, not preachy.
- Ask a narrowing question only if it helps action.`;

    case 'MEANING':
      return `INTENT: MEANING
- Help them name what this touches (fear/need/value).
- Keep it grounded. Avoid clichés.
- One reflective question max.`;

    case 'LISTEN':
      return `INTENT: LISTEN
- Validate + mirror with specificity.
- Minimal advice. Do not force reframes.
- Labels optional. Question may be empty.`;

    default:
      return `INTENT: AUTO
- Choose the most helpful mode based on the user's message.
- If they seem flooded/overwhelmed, lean CALM.
- If they ask what to do, lean NEXT_STEP.`;
  }
}

// ============================================================================
// Identity-Level Thought Mapping
// ============================================================================

function adjustDistortionForIdentityStatement(
  userText: string,
  effectiveLayer: EffectiveLayer,
  thoughtPattern: string
): string {
  const identityPatterns = [
    /^i am [a-z]+\.?$/i,
    /^i'?m [a-z]+\.?$/i,
    /^i am not [a-z]+\.?$/i,
    /^i'?m not [a-z]+\.?$/i,
    /i am (undesirable|unlovable|worthless|hopeless|broken|a failure|a fraud|a burden|a mess|a loser|a disappointment)/i,
    /i'?m (undesirable|unlovable|worthless|hopeless|broken|a failure|a fraud|a burden|a mess|a loser|a disappointment)/i,
  ];

  if (identityPatterns.some(p => p.test(userText)) && effectiveLayer !== 'CORE_WOUND') {
    return 'Labeling';
  }

  return thoughtPattern;
}

// ============================================================================
// Detect repeated effort / hopelessness drift
// ============================================================================

function detectRepeatedEffort(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  const effortPatterns = [
    'no matter how much',
    'no matter what',
    'no matter how hard',
    'over and over',
    'again and again',
    'keep trying',
    'keeps happening',
    'nothing works',
    'nothing i do',
    'always fails',
    'never works',
    'every time',
    'each time',
    'repeatedly',
    'keep failing',
    'tired of trying',
    'sick of trying',
    'gave up',
    'given up',
    'nothing ever goes',
    'nothing ever works',
    'can never',
    "doesn't matter what",
    'does not matter what',
  ];
  return effortPatterns.some(p => s.includes(p));
}

// ============================================================================
// Detect grounding mode choice
// ============================================================================

function userChoseGrounding(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  const groundingIndicators = [
    'grounding',
    'something grounding',
    'shift toward',
    'take a break',
    'step back',
    'pause',
    'reset',
    'comfort',
    'something calming',
    'gentle',
    'ice cream',
    'coffee',
    'walk',
    'tea',
    'breathe',
    'small thing',
    'tiny step',
    'practical step',
  ];
  return groundingIndicators.some(p => s.includes(p));
}

function isInGroundingMode(
  sessionContext: SessionContext | undefined,
  userText: string
): { groundingMode: boolean; groundingTurns: number } {
  const justChoseGrounding = userChoseGrounding(userText);
  const wasInGroundingMode = sessionContext?.groundingMode ?? false;
  const previousTurns = sessionContext?.groundingTurns ?? 0;

  if (justChoseGrounding) return { groundingMode: true, groundingTurns: 1 };

  if (wasInGroundingMode && previousTurns < 3) {
    return { groundingMode: true, groundingTurns: previousTurns + 1 };
  }

  return { groundingMode: false, groundingTurns: 0 };
}

// ============================================================================
// Probe detection + question enforcement
// ============================================================================

function isTherapistProbe(q: string): boolean {
  const s = q.toLowerCase().trim();

  const triggers = [
    'earliest memory',
    'when did you first',
    'how long have you',
    'when did this start',
    'childhood',
    'growing up',
    'in your past',
    'timeline',
    'first started feeling',
    'memory you have of',
    'where did you learn',
    'what happened when you were',
    'where in your body',
    'where do you feel it',
    'where in your head',
    'pin point',
    'pinpoint',
    'describe where',
    'chapter',
    'ending',
    'story',
  ];

  if (triggers.some(t => s.includes(t))) return true;
  if (/^when did\b/.test(s)) return true;
  return false;
}

function choiceQuestion(): string {
  return 'Do you want comfort right now, or a tiny practical step?';
}

function isChoiceQuestionText(q: string): boolean {
  const s = (q || '').toLowerCase();
  if (!s) return false;
  return (
    s.includes('comfort right now') ||
    s.includes('tiny practical step') ||
    (s.includes('comfort') && s.includes('practical')) ||
    (s.includes('do you want') && s.includes('or'))
  );
}

function finalizeQuestion(
  question: string,
  effectiveLayer: EffectiveLayer,
  userText: string,
  previousQuestions: string[],
  groundingMode: boolean = false,
  lastQuestionType: 'choice' | 'open' | '' = ''
): string {
  const q = (question || '').trim();

  const flooded = userSeemsFlooded(userText);
  const probe = q ? isTherapistProbe(q) : false;
  const dup = q ? isDuplicateQuestion(q, previousQuestions) : false;

  // Grounding mode: avoid deep probes; allow simple present-moment question or silence
  if (groundingMode) {
    if (!q || probe) return '';
    const one = q.split(/[.!?]\s/)[0]?.trim() || q;
    if (
      one.toLowerCase().includes('explore') ||
      one.toLowerCase().includes('grounding') ||
      one.toLowerCase().includes('deeply')
    ) {
      return '';
    }
    return one.endsWith('?') ? one : `${one}?`;
  }

  // Don't ask another choice question if last was choice
  const isChoiceQ = isChoiceQuestionText(q);
  if (lastQuestionType === 'choice' && isChoiceQ) return '';

  // Non-core: one sentence max, silence if duplicate/probe
  if (effectiveLayer !== 'CORE_WOUND') {
    if (!q || probe) return '';
    const one = q.split(/[.!?]\s/)[0]?.trim() || q;
    if (isDuplicateQuestion(one, previousQuestions)) return '';
    return one.endsWith('?') ? one : `${one}?`;
  }

  // CORE_WOUND: prefer silence unless genuinely helpful
  if (!q || probe || dup) {
    return flooded ? choiceQuestion() : '';
  }

  const one = q.split(/[.!?]\s/)[0]?.trim() || q;
  const out = one.endsWith('?') ? one : `${one}?`;
  if (isTherapistProbe(out)) return flooded ? choiceQuestion() : '';
  return out;
}

// ============================================================================
// Normalize thought pattern
// ============================================================================

function normalizeThoughtPattern(p?: string): string {
  if (!p) return '';
  const s = String(p).trim();

  const normalizations: Record<string, string> = {
    'black-and-white': 'All-or-nothing thinking',
    'black and white': 'All-or-nothing thinking',
    'all-or-nothing': 'All-or-nothing thinking',
    'all or nothing': 'All-or-nothing thinking',
    catastrophizing: 'Catastrophizing',
    catastrophe: 'Catastrophizing',
    'mind reading': 'Mind reading',
    mindreading: 'Mind reading',
    overgeneralization: 'Overgeneralization',
    'over-generalization': 'Overgeneralization',
    personalization: 'Personalization',
    labeling: 'Labeling',
    'emotional reasoning': 'Emotional reasoning',
    'should statements': 'Should statements',
    'fortune telling': 'Fortune telling',
    'discounting positives': 'Discounting positives',
    'mental filter': 'Mental filter',
    'jumping to conclusions': 'Jumping to conclusions',
    'core belief': 'Core Belief',
    'identity belief': 'Core Belief',
  };

  const lower = s.toLowerCase();
  for (const [key, value] of Object.entries(normalizations)) {
    if (lower.includes(key)) return value;
  }

  return s;
}

function inferFallbackThoughtPattern(userText: string, effectiveLayer: EffectiveLayer): string {
  if (effectiveLayer === 'CORE_WOUND') return 'Core Belief';

  if (
    /(i am|i'm)\s+(a\s+)?(failure|loser|mess|burden|worthless|broken|unlovable|undesirable)/i.test(
      userText
    )
  ) {
    return 'Labeling';
  }

  if (/(replay|loop|can'?t stop thinking|ruminat|over and over|again and again)/i.test(userText)) {
    return 'Rumination';
  }

  if (/(ruin|disaster|everything will|i'?ll be fired|worst case|end of the world)/i.test(userText)) {
    return 'Catastrophizing';
  }

  if (/\b(always|never|everything|nothing|completely|totally|either|only)\b/i.test(userText)) {
    return 'All-or-nothing thinking';
  }

  return '';
}

function coerceThoughtPatternByLayer(thoughtPattern: string, effectiveLayer: EffectiveLayer): string {
  const p = normalizeThoughtPattern(thoughtPattern);
  const isCore = p.toLowerCase() === 'core belief';

  if (effectiveLayer !== 'CORE_WOUND' && isCore) return 'Catastrophizing';
  if (effectiveLayer === 'CORE_WOUND') return 'Core Belief';
  return p;
}

// ============================================================================
// Kill "loop reframes" universally
// ============================================================================

function sanitizeReframeAllLayers(
  reframe: string,
  previousReframes: string[],
  analysis: AnalysisResult,
  effectiveLayer: EffectiveLayer
): string {
  const r = (reframe || '').trim();

  const coreWound = (analysis.core_wound || '').toLowerCase();
  const underlyingFear = (analysis.underlying_fear || '').toLowerCase();
  const isAbandonment =
    coreWound.includes('love') ||
    coreWound.includes('alon') ||
    coreWound.includes('leave') ||
    coreWound.includes('want') ||
    underlyingFear.includes('love') ||
    underlyingFear.includes('alon');
  const isFailure =
    coreWound.includes('fail') ||
    coreWound.includes('enough') ||
    underlyingFear.includes('fail') ||
    underlyingFear.includes('enough');

  if (!r) {
    if (effectiveLayer === 'CORE_WOUND') {
      if (isAbandonment) return `That fear is real — but it doesn’t mean you’re unlovable.`;
      if (isFailure)
        return `Not meeting expectations isn’t proof you’re a disappointment — it’s pressure talking.`;
      return `A painful moment can shake your confidence — but it still doesn’t get to decide your worth.`;
    }
    if (isAbandonment) return `That fear is loud right now, but it isn’t the whole truth about you.`;
    if (isFailure) return `This feels like a verdict, but it’s still a thought under stress — not a final fact.`;
    return `The feeling is real — but the conclusion might be harsher than the facts support.`;
  }

  const cur = normalizeForCompare(r);
  const prev = previousReframes.map(normalizeForCompare);

  const startsWhatIf = cur.startsWith('what if');
  const alreadyUsedWhatIf = prev.some(x => x.startsWith('what if'));
  if (startsWhatIf && alreadyUsedWhatIf) {
    if (isAbandonment || effectiveLayer === 'CORE_WOUND') {
      return `That fear is real — but it doesn’t mean you’re unlovable or alone forever.`;
    }
    return `The feeling is real, but the conclusion may be harsher than the facts.`;
  }

  const metaphorCluster = /(chapter|ending|just a story|black and white|spectrum|math problem|fixed point)/i;
  const prevHasCluster = prev.some(x => metaphorCluster.test(x));
  if (metaphorCluster.test(r) && prevHasCluster) {
    return `Let’s keep this simple: the feeling is real, but the label you’re putting on yourself may be harsher than the facts.`;
  }

  if (effectiveLayer === 'CORE_WOUND') {
    const lower = r.toLowerCase();
    const bannedPhrases = [
      'just a story',
      'one chapter',
      'not the ending',
      'whole truth',
      'black and white photo',
      'spectrum of experiences',
      'math problem',
      'fixed point on a scale',
    ];
    if (bannedPhrases.some(b => lower.includes(b))) {
      return `This belief is your brain trying to protect you from getting hurt again — but it isn’t a verdict on you.`;
    }
  }

  return r;
}

// ============================================================================
// Pattern-note compacting
// ============================================================================

function compactOneSentence(text: string): string {
  const t = (text || '').trim();
  if (!t) return '';
  const one = t.split(/[.!?]\s/)[0]?.trim() || t;
  return /[.!?]$/.test(one) ? one : `${one}.`;
}

function compactTwoSentences(text: string): string {
  const t = (text || '').trim();
  if (!t) return '';
  const parts = t.split(/[.!?]\s/).filter(Boolean);
  const out = parts.slice(0, 2).join('. ').trim();
  return out ? (/[.!?]$/.test(out) ? out : `${out}.`) : '';
}

// ============================================================================
// JSON Parser
// ============================================================================

function parseAIJSON(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    try {
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Hydrate memory from history (now includes ack + encouragement too)
// ============================================================================

function hydrateMemoryFromHistory(
  conversationHistory: ChatMessage[],
  previousQuestions: string[],
  previousReframes: string[],
  previousAcknowledgments: string[],
  previousEncouragements: string[]
): void {
  const recentAssistant = conversationHistory.filter(m => m.role === 'assistant').slice(-12);

  for (const msg of recentAssistant) {
    if (!msg.content) continue;
    const parsedPrev = parseAIJSON(msg.content);
    if (!parsedPrev) continue;

    const q = (parsedPrev.question as string) || (parsedPrev.probingQuestion as string);
    const r = parsedPrev.reframe as string;
    const a = (parsedPrev.acknowledgment as string) || (parsedPrev.content as string);
    const e = parsedPrev.encouragement as string;

    if (q && q.trim() && previousQuestions.length < 35) previousQuestions.push(q.trim());
    if (r && r.trim() && previousReframes.length < 35) previousReframes.push(r.trim());
    if (a && a.trim() && previousAcknowledgments.length < 35) previousAcknowledgments.push(a.trim());
    if (e && e.trim() && previousEncouragements.length < 35) previousEncouragements.push(e.trim());
  }
}

// ============================================================================
// Output Quality: detect generic/templated responses + regenerate
// ============================================================================

function isGenericLine(s: string): boolean {
  const t = normalizeForCompare(s);
  if (!t) return true;
  if (t.length < 10) return true;

  const generic = [
    "you're not alone",
    'storm inside',
    'weather this storm',
    'take it one step at a time',
    'you got this',
    'you are stronger than you think',
    'stay strong',
    'you’re engaging with this',
    'that takes real effort',
    'just talking about it is a step',
    'it matters that you’re showing up',
    'let’s slow it down',
    'pressure makes everything feel final',
    'the feeling is real',
    'not a verdict',
    'i’m with you',
    'that makes sense',
    'i hear you',
    'i understand',
    'that sounds',
    'it seems like',
  ];

  return generic.some(g => t.includes(g));
}

function isGenericQuestion(q: string): boolean {
  const s = (q || '').toLowerCase().trim();
  if (!s) return true;

  const banned = [
    "what's the hardest part",
    'what feels heaviest',
    'what part of this feels most personal',
    "what’s the story your mind keeps replaying",
    "what's the story your mind keeps replaying",
    'tell me more',
    'explore more deeply',
    'where in your body',
  ];

  if (s.length < 14) return true;
  return banned.some(b => s.includes(b));
}

function needsRegeneration(
  out: { acknowledgment?: string; reframe?: string; encouragement?: string; question?: string },
  previousReframes: string[],
  previousQuestions: string[],
  previousAcknowledgments: string[],
  previousEncouragements: string[]
): boolean {
  const a = (out.acknowledgment || '').trim();
  const q = (out.question || '').trim();
  const r = (out.reframe || '').trim();
  const e = (out.encouragement || '').trim();

  // ack must exist and not be generic
  if (!a || isGenericLine(a)) return true;

  if (q) {
    if (isGenericQuestion(q)) return true;
    if (isDuplicateQuestion(q, previousQuestions)) return true;
    if (isNearDuplicateText(q, previousQuestions)) return true;
  }

  if (!r) return true;
  if (isGenericLine(r)) return true;
  if (isDuplicateReframe(r, previousReframes)) return true;

  if (e) {
    if (isGenericLine(e)) return true;
    if (isDuplicateEnc(e, previousEncouragements)) return true;
    if (isNearDuplicateText(e, previousEncouragements)) return true;
  }

  if (a) {
    if (isDuplicateAck(a, previousAcknowledgments)) return true;
    if (isNearDuplicateText(a, previousAcknowledgments)) return true;
  }

  return false;
}

// ============================================================================
// Regeneration: generate fresh candidates (ack + encouragement + question + reframe)
// ============================================================================

async function regeneratePackFresh(args: {
  analysis: AnalysisResult;
  userText: string;
  intent: UserIntent;
  groundingMode: boolean;
  effectiveLayer: EffectiveLayer;
  decision: EngineDecision;
  previousQuestions: string[];
  previousReframes: string[];
  previousAcknowledgments: string[];
  previousEncouragements: string[];
}): Promise<Record<string, unknown> | null> {
  const {
    analysis,
    userText,
    intent,
    groundingMode,
    effectiveLayer,
    decision,
    previousQuestions,
    previousReframes,
    previousAcknowledgments,
    previousEncouragements,
  } = args;

  const regenPrompt = `
You are writing as a premium CBT-based product: a Cognitive Reflection Engine.
Sound human, specific, and non-templated. DO NOT output prefixes like "Candidate #", "Option A/B", numbering, or bullet markers inside any string fields.

User message: "${userText}"

Intent: ${intent}
Layer: ${effectiveLayer}
Grounding mode: ${groundingMode ? 'true' : 'false'}

ENGINE STATE: ${decision.state}
INTERVENTION: ${decision.intervention}
Ask a question this turn: ${decision.askQuestion ? 'true' : 'false'}

What happened: ${analysis.trigger_event}
Interpretation: ${analysis.likely_interpretation}
Fear underneath: ${analysis.underlying_fear}
Need: ${analysis.emotional_need}
Core wound (if any): ${analysis.core_wound || ''}

DO NOT reuse or lightly paraphrase any of these acknowledgments:
${previousAcknowledgments.slice(0, 25).map(x => `- ${x}`).join('\n') || '- (none)'}

DO NOT reuse or lightly paraphrase any of these encouragements:
${previousEncouragements.slice(0, 25).map(x => `- ${x}`).join('\n') || '- (none)'}

DO NOT reuse or lightly paraphrase any of these questions:
${previousQuestions.slice(0, 25).map(q => `- ${q}`).join('\n') || '- (none)'}

DO NOT reuse or lightly paraphrase any of these reframes:
${previousReframes.slice(0, 25).map(r => `- ${r}`).join('\n') || '- (none)'}

Hard rules:
- Acknowledgment MUST be non-empty and specific (no "you're not alone", no "storm", no "I hear you").
- Encouragement optional, but if present it must be natural, not poster-y.
- If AskQuestion=false, return "questions": [].
- If AskQuestion=true, questions must be specific to the user's last message (use a concrete detail). Avoid generic templates.
- Ask at most ONE question will be used, but you may provide up to 3 candidates in "questions".
- Distortion labels ONLY if clearly present and helpful; otherwise set thoughtPattern to "".
- If intent is NEXT_STEP / intervention is TINY_PLAN, put a tiny plan (1–3 steps) inside the reframe.
- Return ONLY valid JSON.

JSON:
{
  "acknowledgments": ["<plain sentence>", "<plain sentence>"],
  "acknowledgment": "<one plain sentence from acknowledgments>",
  "thoughtPattern": "",
  "patternNote": "",
  "reframe": "<plain paragraph>",
  "questions": ["<plain question?>", "<plain question?>"],
  "encouragements": ["<plain sentence>", "<plain sentence>"],
  "encouragement": "<one plain sentence from encouragements or empty>"
}
`.trim();

  const msgs: AIMessage[] = [{ role: 'system', content: regenPrompt }];
  const res = await callAI(msgs);
  if (!res?.content) return null;
  return parseAIJSON(res.content);
}

// ============================================================================
// Phase 1 Prompt
// ============================================================================

function buildAnalysisPrompt(): string {
  return `You have world-class emotional intelligence. You see beneath words - the unspoken fears, old wounds, hidden meanings.

Analyze this message with your full emotional intelligence. Return ONLY JSON.

{
  "trigger_event": "What specific thing happened? Name it precisely.",
  "likely_interpretation": "What meaning did they assign to this? What story are they telling themselves?",
  "underlying_fear": "What are they afraid this reveals about them? Go to the deepest core fear.",
  "emotional_need": "What do they deeply need right now? (to feel worthy, safe, seen, accepted, in control, understood)",
  "core_wound": "What old wound is this touching? What belief about themselves is being activated from their past?"
}

Be precise. Go deep.`;
}

// ============================================================================
// Phase 2 Prompt (state-driven, still CBT-based)
// ============================================================================

function buildResponsePrompt(
  analysis: AnalysisResult,
  previousQuestions: string[] = [],
  previousReframes: string[] = [],
  previousAcknowledgments: string[] = [],
  previousEncouragements: string[] = [],
  originalTrigger: string = '',
  turnCount: number = 1,
  userRevealedCoreBelief: boolean = false,
  coreBeliefJustDetected: boolean = false, // kept for future, not required
  groundingMode: boolean = false,
  intent: UserIntent = 'AUTO',
  decision?: EngineDecision
): string {
  const d =
    decision ??
    ({
      state: 'MAP',
      intervention: 'REFLECT_MAP',
      confidence: 0.5,
      reasons: [],
      askQuestion: true,
    } satisfies EngineDecision);

  const questionsWarning =
    previousQuestions.length > 0
      ? `\n\n⚠️ QUESTIONS YOU'VE ALREADY ASKED - NEVER REPEAT OR PARAPHRASE:\n${previousQuestions
          .slice(0, 10)
          .map(q => `- "${q}"`)
          .join('\n')}`
      : '';

  const reframesWarning =
    previousReframes.length > 0
      ? `\n\n⚠️ REFRAMES YOU'VE ALREADY USED - NEVER REPEAT OR PARAPHRASE:\n${previousReframes
          .slice(0, 8)
          .map(r => `- "${r}"`)
          .join('\n')}`
      : '';

  const ackWarning =
    previousAcknowledgments.length > 0
      ? `\n\n⚠️ ACKNOWLEDGMENTS YOU'VE ALREADY USED - NEVER REPEAT OR PARAPHRASE:\n${previousAcknowledgments
          .slice(0, 8)
          .map(a => `- "${a}"`)
          .join('\n')}`
      : '';

  const encWarning =
    previousEncouragements.length > 0
      ? `\n\n⚠️ ENCOURAGEMENTS YOU'VE ALREADY USED - NEVER REPEAT OR PARAPHRASE:\n${previousEncouragements
          .slice(0, 8)
          .map(e => `- "${e}"`)
          .join('\n')}`
      : '';

  const triggerReminder = originalTrigger ? `\n\n🎯 ORIGINAL TRIGGER: "${originalTrigger}"` : '';
  const intentBlock = intentGuidance(intent);

  // compute effectiveLayer inside prompt for guidance purposes
  const effectiveLayer: EffectiveLayer = userRevealedCoreBelief
    ? 'CORE_WOUND'
    : turnCount <= 2
      ? 'SURFACE'
      : turnCount <= 4
        ? 'TRANSITION'
        : turnCount <= 6
          ? 'EMOTION'
          : 'CORE_WOUND';

  const engineBlock = `ENGINE STATE: ${d.state}
INTERVENTION: ${d.intervention}
AskQuestion: ${d.askQuestion ? 'true' : 'false'}`;

  let stateObjective = '';
  switch (d.state) {
    case 'REGULATE':
      stateObjective = `Objective: reduce arousal and stabilize. Avoid labels. Prefer no questions.`;
      break;
    case 'CLARIFY':
      stateObjective = `Objective: separate facts vs story. If you ask a question, it must be concrete.`;
      break;
    case 'PLAN':
      stateObjective = `Objective: produce a tiny plan (1–3 steps) that fits their situation. Optional 1 narrowing question.`;
      break;
    case 'RESTRUCTURE':
      stateObjective = `Objective: if a distortion is clearly present, name it (otherwise leave blank) and provide a clean reframe.`;
      break;
    case 'PRESENCE':
      stateObjective = `Objective: validate + mirror with specificity. No advice. No questions unless user asked one.`;
      break;
    default:
      stateObjective = `Objective: map interpretation → fear → need in plain language. Optional one question max.`;
      break;
  }

  // Grounding mode prompt
  if (groundingMode || d.state === 'REGULATE') {
    return `You are a premium CBT-based product voice: human, specific, non-templated.
You are NOT a therapy bot.

${engineBlock}
${stateObjective}

${intentBlock}
${triggerReminder}

${ackWarning}${encWarning}${questionsWarning}${reframesWarning}

Return ONLY valid JSON:

{
  "acknowledgments": [
    "Option #1: specific and human (no therapy clichés)",
    "Option #2: different angle, also specific"
  ],
  "acknowledgment": "choose your best",
  "thoughtPattern": "",
  "patternNote": "",
  "reframe": "Grounding or calming instruction. Present-moment. Sensory if helpful.",
  "questions": [],
  "encouragements": [
    "Optional: one natural supportive line (NOT poster-y), OR return []"
  ],
  "encouragement": ""
}

STYLE RULES:
- NO distortion labels
- NO deep probing
- Avoid: "you're not alone", "storm", "weather this", "I hear you".`;
  }

  let layerGuidance = '';
  if (effectiveLayer === 'SURFACE') {
    layerGuidance = `📍 CURRENT LAYER: SURFACE
- Be curious, not clinical.
- Track what happened + what it means.
- At most ONE question, and only if it helps.`;
  } else if (effectiveLayer === 'TRANSITION') {
    layerGuidance = `📍 CURRENT LAYER: TRANSITION
- Connect the trigger to what it MEANS to them.
- At most ONE question, and only if it helps.`;
  } else if (effectiveLayer === 'EMOTION') {
    layerGuidance = `📍 CURRENT LAYER: EMOTION
- Sit with the feeling. Slow down.
- No timeline probing.
- At most ONE question, and only if it helps.`;
  } else {
    layerGuidance = `📍 CURRENT LAYER: CORE WOUND (PRESENCE MODE)
- thoughtPattern MUST be exactly "Core Belief".
- No timelines. No "when did this start".
- patternNote: ONE sentence max.
- questions OPTIONAL (prefer [] if unsure).
- Avoid clichés and motivational poster language.`;
  }

  const askQuestionRule = d.askQuestion
    ? `- Questions: you MAY generate 0..3 candidates, but at most one will be used.`
    : `- Questions: return [] (do not ask a question this turn).`;

  return `You are a premium CBT-based product voice: human, specific, non-templated.
You are NOT a therapy bot.

${engineBlock}
${stateObjective}

${triggerReminder}

${intentBlock}

YOUR ANALYSIS (beneath the words):
- What happened: ${analysis.trigger_event}
- Their interpretation: ${analysis.likely_interpretation}
- The fear underneath: ${analysis.underlying_fear}
- What they need: ${analysis.emotional_need}
- The wound this touches: ${analysis.core_wound}

${questionsWarning}${reframesWarning}${ackWarning}${encWarning}
${layerGuidance}

Return ONLY valid JSON:

{
  "acknowledgments": [
    "Option A (specific, grounded, no clichés)",
    "Option B (different angle, still specific)"
  ],
  "acknowledgment": "Pick the best one from acknowledgments and paste it here exactly (no labels).",
  "thoughtPattern": "If clearly present, a pattern name. Otherwise empty string.",
  "patternNote": "Short explanation (1–2 sentences). CORE WOUND: one sentence max.",
  "reframe": "State-appropriate. If intervention=TINY_PLAN, include a tiny plan (1–3 steps).",
  "questions": [
    "One concrete question (optional)",
    "Alternative concrete question (optional)"
  ],
  "encouragements": [
    "Optional supportive line (natural, specific)",
    "Alternative supportive line (optional)"
  ],
  "encouragement": "Pick the best one from encouragements and paste it here exactly (or empty string)."
}

RULES:
- Acknowledgment must be non-empty and specific (no 'you're not alone', no 'storm', no 'I hear you').
- Avoid repeating or lightly paraphrasing warnings.
${askQuestionRule}
- If you output questions, they MUST use at least one concrete detail from the user's last message.
- Avoid generic templates (banned: "hardest part", "heaviest", "most personal", "story your mind keeps replaying", "tell me more").
- Avoid therapy-probing (no childhood/timeline/body-location interrogation).
- If user is stabilizing / saying thanks / feeling better, return "questions": [].
- Encouragement optional; if present, must not be motivational poster language.`;
}

// ============================================================================
// Candidate pickers (anti-template selection)
// ============================================================================

function coerceQuestionMark(s: string): string {
  const t = (s || '').trim();
  if (!t) return '';
  return t.endsWith('?') ? t : `${t}?`;
}

function pickBestQuestionCandidate(candidates: string[], previousQuestions: string[]): string {
  for (const raw of candidates) {
    const q = coerceQuestionMark(raw);
    if (!q) continue;
    if (isTherapistProbe(q)) continue;
    if (isGenericQuestion(q)) continue;
    if (isDuplicateQuestion(q, previousQuestions)) continue;
    if (isNearDuplicateText(q, previousQuestions)) continue;
    return q;
  }
  return '';
}

function pickBestAckCandidate(candidates: string[], previousAcknowledgments: string[]): string {
  for (const raw of candidates) {
    const a = (raw || '').trim();
    if (!a) continue;
    if (isGenericLine(a)) continue;
    if (isDuplicateAck(a, previousAcknowledgments)) continue;
    if (isNearDuplicateText(a, previousAcknowledgments)) continue;
    return a;
  }
  return '';
}

function pickBestEncCandidate(candidates: string[], previousEncouragements: string[]): string {
  for (const raw of candidates) {
    const e = (raw || '').trim();
    if (!e) continue;
    if (isGenericLine(e)) continue;
    if (isDuplicateEnc(e, previousEncouragements)) continue;
    if (isNearDuplicateText(e, previousEncouragements)) continue;
    return e;
  }
  return '';
}

// ============================================================================
// Ensure ALL fields (with anti-template selection + minimal fallback pools)
// ============================================================================

function ensureAllLayers(
  parsed: Record<string, unknown>,
  analysis: AnalysisResult,
  effectiveLayer: EffectiveLayer,
  userText: string,
  previousReframes: string[],
  previousQuestions: string[],
  previousAcknowledgments: string[],
  previousEncouragements: string[],
  decision: EngineDecision,
  frozenThoughtPattern?: string,
  previousDistortion?: string,
  groundingMode: boolean = false,
  lastQuestionType: 'choice' | 'open' | '' = '',
  intent: UserIntent = 'AUTO'
): Record<string, unknown> {
  const icebergLayer =
    effectiveLayer === 'SURFACE'
      ? 'surface'
      : effectiveLayer === 'TRANSITION'
        ? 'trigger'
        : effectiveLayer === 'EMOTION'
          ? 'emotion'
          : 'coreBelief';

  const snippet = userText.trim().slice(0, 90);
  const snippetIsShort = snippet.length < 25;

  // Acknowledgment fallback pool (non-empty, but not huge template bank)
  const acknowledgmentOptions =
    effectiveLayer === 'CORE_WOUND'
      ? [
          `Ouch. That’s heavy to carry.`,
          `That cuts deep.`,
          `That’s a painful place to be — and you’re naming it.`,
          snippetIsShort ? `"${snippet}" — yeah. That hurts.` : `I get why this feels so sharp.`,
        ]
      : [
          `Okay — got it.`,
          `Yeah.`,
          `Got it.`,
          snippetIsShort ? `"${snippet}" — noted.` : `Thanks for putting words to it.`,
        ];

  const fallbackAcknowledgment =
    acknowledgmentOptions[Math.floor(Math.random() * acknowledgmentOptions.length)];

  const isRepeatedEffort = detectRepeatedEffort(userText);

  const patternNoteOptions = groundingMode
    ? ['']
    : effectiveLayer === 'CORE_WOUND'
      ? [
          `That belief shows up fast when the pressure hits.`,
          `There’s a deep fear driving this.`,
          `This lands at identity-level, not just a passing thought.`,
        ]
      : isRepeatedEffort
        ? [
            `This sounds less like a distortion and more like exhaustion.`,
            `When effort keeps hitting walls, the mind reaches for a harsh explanation.`,
          ]
        : [
            `When the stakes feel high, the mind tries to “solve” it by predicting outcomes.`,
            `When you’re depleted, thoughts get more absolute.`,
          ];

  const priorNotesPool = [
    ...previousQuestions,
    ...previousReframes,
    ...previousAcknowledgments,
    ...previousEncouragements,
  ];

  let fallbackPatternNote = patternNoteOptions[Math.floor(Math.random() * patternNoteOptions.length)];
  if (fallbackPatternNote && isDuplicatePatternNote(fallbackPatternNote, priorNotesPool)) {
    const alt = patternNoteOptions.find(n => n && !isDuplicatePatternNote(n, priorNotesPool));
    if (alt) fallbackPatternNote = alt;
  }

  const inferredFallbackPattern = groundingMode ? '' : inferFallbackThoughtPattern(userText, effectiveLayer);

  const coreWound = (analysis.core_wound || '').toLowerCase();
  const underlyingFear = (analysis.underlying_fear || '').toLowerCase();
  const isAbandonment =
    coreWound.includes('love') || coreWound.includes('alon') || underlyingFear.includes('love') || underlyingFear.includes('alon');
  const isFailure =
    coreWound.includes('fail') || coreWound.includes('enough') || underlyingFear.includes('fail') || underlyingFear.includes('enough');

  const fallbackReframeOptions =
    effectiveLayer === 'CORE_WOUND'
      ? isAbandonment
        ? [`That fear is real — but it doesn’t mean you’re unlovable.`]
        : isFailure
          ? [`Not meeting expectations isn’t proof you’re a disappointment — it’s pressure talking.`]
          : [
              `A painful moment can shake your confidence — but it still doesn’t get to decide your worth.`,
              `It feels true right now — but pressure can make it feel bigger than it is.`,
            ]
      : isRepeatedEffort
        ? [
            `Effort without results doesn’t erase the effort. Timing and constraints are real.`,
            `The harsh conclusion isn’t the only explanation here.`,
          ]
        : [
            `The feeling is real — but the conclusion might be harsher than the facts support.`,
            `It can make emotional sense and still not be the full picture.`,
          ];

  const fallbackReframe = groundingMode
    ? `You don’t have to solve everything right now — just take the next breath.`
    : fallbackReframeOptions[Math.floor(Math.random() * fallbackReframeOptions.length)];

  // Default: silence (we only keep question/enc if model provides good candidates)
  const fallbackQuestion = '';
  const fallbackEncouragement = groundingMode ? `Taking care of yourself is valid.` : '';

  // --- Acknowledgment selection ---
  const ackCandidatesRaw = Array.isArray((parsed as any).acknowledgments) ? (parsed as any).acknowledgments : [];
  const ackCandidates: string[] = ackCandidatesRaw
    .filter((x: any) => typeof x === 'string')
    .map((x: string) => x.trim())
    .filter(Boolean);

  const ackFromList = pickBestAckCandidate(ackCandidates, previousAcknowledgments);

  const singleAck =
    typeof (parsed as any).acknowledgment === 'string'
      ? String((parsed as any).acknowledgment).trim()
      : typeof (parsed as any).content === 'string'
        ? String((parsed as any).content).trim()
        : '';

  const singleAckOk =
    !!singleAck &&
    !isGenericLine(singleAck) &&
    !isDuplicateAck(singleAck, previousAcknowledgments) &&
    !isNearDuplicateText(singleAck, previousAcknowledgments);

  const acknowledgment = ackFromList || (singleAckOk ? singleAck : fallbackAcknowledgment);

  // --- Thought pattern behavior ---
  let thoughtPattern: string;

  const rawPatternCandidate =
    normalizeThoughtPattern((parsed as any).thoughtPattern || (parsed as any).distortionType) ||
    inferredFallbackPattern;

  if (groundingMode || decision.state === 'REGULATE') {
    thoughtPattern = '';
  } else if (effectiveLayer === 'CORE_WOUND') {
    thoughtPattern = frozenThoughtPattern ? normalizeThoughtPattern(frozenThoughtPattern) : 'Core Belief';
  } else {
    const aiProvidedPattern =
      typeof (parsed as any).thoughtPattern === 'string' && String((parsed as any).thoughtPattern).trim()
        ? normalizeThoughtPattern(String((parsed as any).thoughtPattern))
        : typeof (parsed as any).distortionType === 'string' && String((parsed as any).distortionType).trim()
          ? normalizeThoughtPattern(String((parsed as any).distortionType))
          : '';

    if ((intent === 'CALM' || intent === 'LISTEN') && !aiProvidedPattern) {
      thoughtPattern = '';
    } else if (previousDistortion && previousDistortion !== 'Core Belief') {
      const previousIsSimilar =
        (previousDistortion === 'Labeling' && /(i am|i'm|i feel like i'm)/i.test(userText)) ||
        (previousDistortion === 'Catastrophizing' && /\b(worst|ruin|disaster|end|fired)\b/i.test(userText)) ||
        (previousDistortion === 'All-or-nothing thinking' &&
          /\b(always|never|everything|nothing|either|only|completely|totally)\b/i.test(userText));

      if (previousIsSimilar) {
        thoughtPattern = previousDistortion;
      } else {
        thoughtPattern = frozenThoughtPattern
          ? normalizeThoughtPattern(frozenThoughtPattern)
          : coerceThoughtPatternByLayer(rawPatternCandidate, effectiveLayer);
        thoughtPattern = adjustDistortionForIdentityStatement(userText, effectiveLayer, thoughtPattern);
      }
    } else {
      thoughtPattern = frozenThoughtPattern
        ? normalizeThoughtPattern(frozenThoughtPattern)
        : coerceThoughtPatternByLayer(rawPatternCandidate, effectiveLayer);
      thoughtPattern = adjustDistortionForIdentityStatement(userText, effectiveLayer, thoughtPattern);
    }
  }

  // Pattern note compacting
  let patternNote =
    (parsed as any).patternNote ||
    (parsed as any).distortionExplanation ||
    fallbackPatternNote;

  if (!groundingMode && decision.state !== 'REGULATE') {
    patternNote =
      effectiveLayer === 'CORE_WOUND'
        ? compactOneSentence(String(patternNote || '')) || fallbackPatternNote
        : compactTwoSentences(String(patternNote || '')) || fallbackPatternNote;
  } else {
    patternNote = '';
  }

  // Reframe sanitization
  let reframe = (parsed as any).reframe || fallbackReframe;
  reframe = sanitizeReframeAllLayers(String(reframe || ''), previousReframes, analysis, effectiveLayer);

  if (isDuplicateReframe(reframe, previousReframes) || isNearDuplicateText(reframe, previousReframes)) {
    reframe = groundingMode ? `Let’s take one small breath here.` : `Let’s pause — this is feeling more final than it actually is.`;
  }

  // --- Question handling ---
  let question = '';

  if (decision.askQuestion && decision.state !== 'REGULATE' && intent !== 'CALM' && intent !== 'LISTEN') {
    const qCandidatesRaw = Array.isArray((parsed as any).questions) ? (parsed as any).questions : [];
    const qCandidates: string[] = qCandidatesRaw
      .filter((x: any) => typeof x === 'string')
      .map((x: string) => x.trim())
      .filter(Boolean);

    const qFromList = pickBestQuestionCandidate(qCandidates, previousQuestions);

    const singleQ = typeof (parsed as any).question === 'string' ? String((parsed as any).question).trim() : '';
    const singleQOk =
      !!singleQ &&
      !isTherapistProbe(singleQ) &&
      !isGenericQuestion(singleQ) &&
      !isDuplicateQuestion(singleQ, previousQuestions) &&
      !isNearDuplicateText(singleQ, previousQuestions);

    const rawChosenQ = qFromList || (singleQOk ? coerceQuestionMark(singleQ) : fallbackQuestion);

    question = finalizeQuestion(rawChosenQ, effectiveLayer, userText, previousQuestions, groundingMode, lastQuestionType);
  } else {
    question = ''; // enforced silence
  }

  // --- Encouragement handling ---
  const encCandidatesRaw = Array.isArray((parsed as any).encouragements) ? (parsed as any).encouragements : [];
  const encCandidates: string[] = encCandidatesRaw
    .filter((x: any) => typeof x === 'string')
    .map((x: string) => x.trim())
    .filter(Boolean);

  const encFromList = pickBestEncCandidate(encCandidates, previousEncouragements);

  const singleEnc = typeof (parsed as any).encouragement === 'string' ? String((parsed as any).encouragement).trim() : '';

  const singleEncOk =
    !!singleEnc &&
    !isGenericLine(singleEnc) &&
    !isDuplicateEnc(singleEnc, previousEncouragements) &&
    !isNearDuplicateText(singleEnc, previousEncouragements);

  const encouragement = encFromList || (singleEncOk ? singleEnc : fallbackEncouragement);

  return {
    acknowledgment: String(acknowledgment),
    thoughtPattern: String(thoughtPattern),
    patternNote: String(patternNote),
    reframe: String(reframe),
    question: question ?? '',
    encouragement: String(encouragement),

    // Back-compat fields (so your existing UI doesn’t break)
    content: String(acknowledgment),
    distortionType: String(thoughtPattern),
    distortionExplanation: String(patternNote),
    probingQuestion: question ?? '',
    icebergLayer: String(icebergLayer),
    layerInsight: String(analysis.core_wound || analysis.underlying_fear || ''),
  };
}

// ============================================================================
// MAIN exported engine function
// ============================================================================

export interface RunEngineInput {
  userText: string;
  conversationHistory?: ChatMessage[];
  sessionContext?: SessionContext;
}

export async function runEngine(input: RunEngineInput) {
  const { userText, conversationHistory = [], sessionContext } = input;

  // ✅ Crisis detection inside engine so /api/reframe and /api/engine behave same
  const crisisCheck = checkCrisisKeywords(userText);
  if (crisisCheck.level === SEVERITY_LEVELS.HIGH) {
    return {
      acknowledgment:
        "You're sharing something really serious, and I want to make sure you get the right support.",
      thoughtPattern: 'Crisis Response',
      patternNote: 'Right now your safety is the priority.',
      reframe: "This moment doesn't define you. There are people trained to help.",
      question: 'Would you like me to connect you with someone who can help right now?',
      encouragement: generateCrisisResponse(SEVERITY_LEVELS.HIGH),
      probingQuestion: "Would you like to talk about what's bringing these feelings up?",
      icebergLayer: 'surface',
      layerInsight: 'Your safety matters most right now.',
      _isCrisisResponse: true,
      _meta: { crisis: true },
    };
  }

  const turnCount = Math.floor(conversationHistory.length / 2) + 1;

  // Resolve intent (Reflect-only)
  const intent = resolveIntent(sessionContext);

  // Grounding mode
  const { groundingMode, groundingTurns } = isInGroundingMode(sessionContext, userText);

  // Phase 1: Analysis
  const analysisMessages: AIMessage[] = [{ role: 'system', content: buildAnalysisPrompt() }];

  if (conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach(msg => {
      analysisMessages.push({ role: msg.role, content: msg.content || '' });
    });
  }
  analysisMessages.push({ role: 'user', content: userText });

  let analysisResponse = await callAI(analysisMessages);
  if (!analysisResponse?.content) analysisResponse = await callAI(analysisMessages);

  let analysis: AnalysisResult = {
    trigger_event: 'Something happened that triggered a reaction',
    likely_interpretation: 'This situation has meaning to them',
    underlying_fear: "There's a fear underneath",
    emotional_need: 'Understanding',
  };

  if (analysisResponse?.content) {
    const parsedAnalysis = parseAIJSON(analysisResponse.content) as AnalysisResult | null;
    if (parsedAnalysis) analysis = parsedAnalysis;
  }

  // Deterministic engine decision (hybrid)
  const decision = decideEngineState(userText, analysis, intent, groundingMode);

  // Phase 2: Core belief detection
  const coreBeliefPatterns = [
    /i am not (built|made|cut out|good|smart|capable|worthy|enough|lovable|deserving)/i,
    /i'm not (built|made|cut out|good|smart|capable|worthy|enough|lovable|deserving)/i,
    /i am (a failure|worthless|hopeless|broken|fraud|burden|loser|mess|disappointment|undesirable)/i,
    /i'm (a failure|worthless|hopeless|broken|fraud|burden|loser|mess|disappointment|undesirable)/i,
    /i can't (do|be|handle|figure|seem to|ever)/i,
    /i (don't|do not) (deserve|belong|matter|fit in)/i,
    /i will never (be|find|get|have|become|amount)/i,
    /i'?ll never (be|find|get|have|become|amount)/i,
    /nothing i (do|try) (matters|works|is enough|ever)/i,
    /no one('s| is| will| would| can| going to| gonna) (love|want|care|stay|be there)/i,
    /no-?one('s| is| will| would| can| going to| gonna) (love|want|care|stay|be there)/i,
    /nobody('s| is| will| would| can| going to| gonna) (love|want|care|stay|be there)/i,
    /no one will ever/i,
    /nobody will ever/i,
    /everyone (leaves|leaving|left|abandons)/i,
    /they'?re all (going to|gonna) leave/i,
    /i'?ll (always|forever) be (alone|lonely|single)/i,
    /i will die alone/i,
    /i'?ve always been/i,
    /i always (fail|mess up|screw up|ruin|destroy)/i,
    /everything i (do|try) (fails|is wrong|is not enough)/i,
    /that means i'?m (not|a|an)/i,
    /that'?s just who i am/i,
    /i don't (have any|have no) (worth|value|purpose)/i,
    /i (have no|don't have any) (business|right|place)/i,
    /i (feel|think|believe) (like )?i'?m (not|a|an)/i,
    /i don't believe in (myself|me)/i,
    /what'?s (wrong|the matter) with me/i,
    /why (can't|do|am) i (not|never|always)/i,
    /i (give up|quit|can't do this anymore)/i,
  ];

  const userRevealedCoreBelief = coreBeliefPatterns.some(p => p.test(userText));

  const effectiveLayer: EffectiveLayer = userRevealedCoreBelief
    ? 'CORE_WOUND'
    : turnCount <= 2
      ? 'SURFACE'
      : turnCount <= 4
        ? 'TRANSITION'
        : turnCount <= 6
          ? 'EMOTION'
          : 'CORE_WOUND';

  // Hydrate memory from history
  const previousQuestions: string[] = [...(sessionContext?.previousQuestions ?? [])];
  const previousReframes: string[] = [...(sessionContext?.previousReframes ?? [])];
  const previousAcknowledgments: string[] = [...(sessionContext?.previousAcknowledgments ?? [])];
  const previousEncouragements: string[] = [...(sessionContext?.previousEncouragements ?? [])];

  hydrateMemoryFromHistory(
    conversationHistory,
    previousQuestions,
    previousReframes,
    previousAcknowledgments,
    previousEncouragements
  );

  const originalTrigger =
    sessionContext?.originalTrigger ?? conversationHistory.find(m => m.role === 'user')?.content ?? '';

  const coreBeliefJustDetected = userRevealedCoreBelief && !sessionContext?.coreBeliefAlreadyDetected;

  const previousDistortion = sessionContext?.previousDistortions?.[0];

  const lastQuestion = sessionContext?.previousQuestions?.[0] || '';
  const lastQuestionType: 'choice' | 'open' | '' =
    isChoiceQuestionText(lastQuestion) ? 'choice' : lastQuestion ? 'open' : '';

  const frozenThoughtPattern =
    effectiveLayer === 'CORE_WOUND'
      ? normalizeThoughtPattern(sessionContext?.previousDistortions?.[0] ?? 'Core Belief')
      : undefined;

  // Phase 2: Response
  const responseMessages: AIMessage[] = [
    {
      role: 'system',
      content: buildResponsePrompt(
        analysis,
        previousQuestions,
        previousReframes,
        previousAcknowledgments,
        previousEncouragements,
        originalTrigger,
        turnCount,
        userRevealedCoreBelief,
        coreBeliefJustDetected,
        groundingMode,
        intent,
        decision
      ),
    },
  ];

  if (conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach(msg => {
      responseMessages.push({ role: msg.role, content: msg.content || '' });
    });
  }
  responseMessages.push({ role: 'user', content: userText });

  let responseResult = await callAI(responseMessages);
  if (!responseResult?.content) responseResult = await callAI(responseMessages);

  // If model failed completely, try a regen pack once before falling back
  if (!responseResult?.content) {
    const regenParsed = await regeneratePackFresh({
      analysis,
      userText,
      intent,
      groundingMode,
      effectiveLayer,
      decision,
      previousQuestions,
      previousReframes,
      previousAcknowledgments,
      previousEncouragements,
    });

    const fallbackResponse = ensureAllLayers(
      regenParsed || {},
      analysis,
      effectiveLayer,
      userText,
      previousReframes,
      previousQuestions,
      previousAcknowledgments,
      previousEncouragements,
      decision,
      frozenThoughtPattern,
      previousDistortion,
      groundingMode,
      lastQuestionType,
      intent
    );

    const effectiveTurnForProgress = userRevealedCoreBelief ? Math.max(turnCount, 7) : turnCount;

    return {
      ...fallbackResponse,
      progressScore: Math.min(effectiveTurnForProgress * 12, 100),
      layerProgress: {
        surface: Math.min(effectiveTurnForProgress * 25, 100),
        trigger: Math.min(Math.max(0, effectiveTurnForProgress - 1) * 30, 100),
        emotion: Math.min(Math.max(0, effectiveTurnForProgress - 2) * 35, 100),
        coreBelief: userRevealedCoreBelief
          ? 60
          : Math.min(Math.max(0, effectiveTurnForProgress - 4) * 30, 100),
      },
      groundingMode,
      groundingTurns,
      _meta: {
        provider: 'fallback',
        turn: turnCount,
        effectiveLayer,
        intent,
        state: decision.state,
        intervention: decision.intervention,
        confidence: decision.confidence,
      },
    };
  }

  const parsed = parseAIJSON(responseResult.content);

  let completeResponse = ensureAllLayers(
    parsed || {},
    analysis,
    effectiveLayer,
    userText,
    previousReframes,
    previousQuestions,
    previousAcknowledgments,
    previousEncouragements,
    decision,
    frozenThoughtPattern,
    previousDistortion,
    groundingMode,
    lastQuestionType,
    intent
  );

  // If generic/repetitive, regenerate a fresh pack once and re-ensure
  const outAck = String((completeResponse as any).acknowledgment || '');
  const outReframe = String((completeResponse as any).reframe || '');
  const outEnc = String((completeResponse as any).encouragement || '');
  const outQ = String((completeResponse as any).question || '');

  if (
    needsRegeneration(
      { acknowledgment: outAck, reframe: outReframe, encouragement: outEnc, question: outQ },
      previousReframes,
      previousQuestions,
      previousAcknowledgments,
      previousEncouragements
    )
  ) {
    const regenParsed = await regeneratePackFresh({
      analysis,
      userText,
      intent,
      groundingMode,
      effectiveLayer,
      decision,
      previousQuestions,
      previousReframes,
      previousAcknowledgments,
      previousEncouragements,
    });

    if (regenParsed) {
      completeResponse = ensureAllLayers(
        regenParsed,
        analysis,
        effectiveLayer,
        userText,
        previousReframes,
        previousQuestions,
        previousAcknowledgments,
        previousEncouragements,
        decision,
        frozenThoughtPattern,
        previousDistortion,
        groundingMode,
        lastQuestionType,
        intent
      );
    }
  }

  const effectiveTurnForProgress = userRevealedCoreBelief ? Math.max(turnCount, 7) : turnCount;
  const progressScore = Math.min(effectiveTurnForProgress * 12, 100);

  const layerProgress = {
    surface: Math.min(effectiveTurnForProgress * 25, 100),
    trigger: Math.min(Math.max(0, effectiveTurnForProgress - 1) * 30, 100),
    emotion: Math.min(Math.max(0, effectiveTurnForProgress - 2) * 35, 100),
    coreBelief: Math.min(Math.max(0, effectiveTurnForProgress - 4) * 30, 100),
  };
  if (userRevealedCoreBelief) layerProgress.coreBelief = Math.max(layerProgress.coreBelief, 60);

  return {
    ...completeResponse,
    progressScore,
    layerProgress,
    groundingMode,
    groundingTurns,
    _meta: {
      provider: responseResult.provider,
      model: responseResult.model,
      turn: turnCount,
      effectiveLayer,
      coreBeliefDetected: userRevealedCoreBelief,
      intent,
      state: decision.state,
      intervention: decision.intervention,
      confidence: decision.confidence,
      reasons: decision.reasons,
    },
  };
}
