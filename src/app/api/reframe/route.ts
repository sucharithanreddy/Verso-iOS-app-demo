// src/app/api/reframe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateThought } from '@/lib/input-validation';
import {
  checkCrisisKeywords,
  generateCrisisResponse,
  SEVERITY_LEVELS,
} from '@/lib/crisis-detection';
import { callAI, type AIMessage } from '@/lib/ai-service';

// ============================================================================
// TWO-PHASE AI ARCHITECTURE
// Phase 1: Deep emotional analysis
// Phase 2: Response generation (CBT + iceberg model)
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type UserIntent = 'AUTO' | 'CALM' | 'CLARITY' | 'NEXT_STEP' | 'MEANING' | 'LISTEN';

interface SessionContext {
  previousTopics?: string[];
  previousDistortions?: string[];
  sessionCount?: number;
  previousQuestions?: string[];
  previousReframes?: string[];
  originalTrigger?: string;
  coreBeliefAlreadyDetected?: boolean;
  groundingMode?: boolean;
  groundingTurns?: number;
  lastQuestionType?: 'choice' | 'open' | '';
  userIntent?: UserIntent; // Reflect-only intent router (set by UI)
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
// Normalize for comparison
// ============================================================================

function normalizeForCompare(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// ============================================================================
// Hard Block Exact Repetition (questions + reframes + pattern notes)
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
// "I am undesirable" -> "Labeling" not "Catastrophizing"
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
    'no matter how much', 'no matter what', 'no matter how hard',
    'over and over', 'again and again', 'keep trying', 'keeps happening',
    'nothing works', 'nothing i do', 'always fails', 'never works',
    'every time', 'each time', 'repeatedly', 'keep failing',
    'tired of trying', 'sick of trying', 'gave up', 'given up',
    'nothing ever goes', 'nothing ever works', 'can never',
    "doesn't matter what", 'does not matter what',
  ];
  return effortPatterns.some(p => s.includes(p));
}

// ============================================================================
// Detect flooded/overwhelmed users
// ============================================================================

function userSeemsFlooded(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  const floodIndicators = [
    "i don't know", "dont know", "can't recall", "cant recall",
    "can't pinpoint", "cant pinpoint", "not sure", "idk",
    "whatever", "nothing", "blank", "mind is blank",
    "i can't think", "too much", "overwhelmed",
  ];
  return floodIndicators.some(p => s.includes(p));
}

// ============================================================================
// Detect grounding mode choice
// ============================================================================

function userChoseGrounding(text: string): boolean {
  const s = (text || '').toLowerCase().trim();
  const groundingIndicators = [
    'grounding', 'something grounding', 'shift toward',
    'take a break', 'step back', 'pause', 'reset',
    'comfort', 'something calming', 'gentle',
    'ice cream', 'coffee', 'walk', 'tea', 'breathe',
    'small thing', 'tiny step', 'practical step',
  ];
  return groundingIndicators.some(p => s.includes(p));
}

// ============================================================================
// Check if user is in grounding/practical mode
// ============================================================================

function isInGroundingMode(
  sessionContext: SessionContext | undefined,
  userText: string
): { groundingMode: boolean; groundingTurns: number } {
  const justChoseGrounding = userChoseGrounding(userText);
  const wasInGroundingMode = sessionContext?.groundingMode ?? false;
  const previousTurns = sessionContext?.groundingTurns ?? 0;

  if (justChoseGrounding) {
    return { groundingMode: true, groundingTurns: 1 };
  }

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
    'earliest memory', 'when did you first', 'how long have you',
    'when did this start', 'childhood', 'growing up', 'in your past',
    'timeline', 'first started feeling', 'memory you have of',
    'where did you learn', 'what happened when you were',
    'where in your body', 'where do you feel it', 'where in your head',
    'pin point', 'pinpoint', 'describe where',
    'chapter', 'ending', 'story',
  ];

  if (triggers.some(t => s.includes(t))) return true;
  if (/^when did\b/.test(s)) return true;

  return false;
}

// ============================================================================
// Premium question finalization (less templated)
// ============================================================================

function choiceQuestion(): string {
  // keep this very rare; only used in CORE_WOUND + flooded
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
  if (lastQuestionType === 'choice' && isChoiceQ) {
    return ''; // silence > templates
  }

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
    'catastrophizing': 'Catastrophizing',
    'catastrophe': 'Catastrophizing',
    'mind reading': 'Mind reading',
    'mindreading': 'Mind reading',
    'overgeneralization': 'Overgeneralization',
    'over-generalization': 'Overgeneralization',
    'personalization': 'Personalization',
    'labeling': 'Labeling',
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

// ============================================================================
// Smart fallback distortion inference (prevents bad labels for factual statements)
// ============================================================================

function inferFallbackThoughtPattern(userText: string, effectiveLayer: EffectiveLayer): string {
  if (effectiveLayer === 'CORE_WOUND') return 'Core Belief';

  if (/(i am|i'm)\s+(a\s+)?(failure|loser|mess|burden|worthless|broken|unlovable|undesirable)/i.test(userText)) {
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

// ============================================================================
// Layer-gate "Core Belief" - only allow in CORE_WOUND
// ============================================================================

function coerceThoughtPatternByLayer(thoughtPattern: string, effectiveLayer: EffectiveLayer): string {
  const p = normalizeThoughtPattern(thoughtPattern);
  const isCore = p.toLowerCase() === 'core belief';

  if (effectiveLayer !== 'CORE_WOUND' && isCore) {
    return 'Catastrophizing';
  }

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
    coreWound.includes('love') || coreWound.includes('alon') ||
    coreWound.includes('leave') || coreWound.includes('want') ||
    underlyingFear.includes('love') || underlyingFear.includes('alon');
  const isFailure =
    coreWound.includes('fail') || coreWound.includes('enough') ||
    underlyingFear.includes('fail') || underlyingFear.includes('enough');

  if (!r) {
    if (effectiveLayer === 'CORE_WOUND') {
      if (isAbandonment) return `That fear is real — but it doesn’t mean you’re unlovable.`;
      if (isFailure) return `Not meeting expectations isn’t proof you’re a disappointment — it’s pressure talking.`;
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
      'just a story', 'one chapter', 'not the ending', 'whole truth',
      'black and white photo', 'spectrum of experiences', 'math problem', 'fixed point on a scale',
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
// Hydrate memory from history
// ============================================================================

function hydrateMemoryFromHistory(
  conversationHistory: ChatMessage[],
  previousQuestions: string[],
  previousReframes: string[]
): void {
  const recentAssistant = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-10);

  for (const msg of recentAssistant) {
    if (!msg.content) continue;

    const parsedPrev = parseAIJSON(msg.content);
    if (!parsedPrev) continue;

    const q = (parsedPrev.question as string) || (parsedPrev.probingQuestion as string);
    const r = (parsedPrev.reframe as string);

    if (q && q.trim() && previousQuestions.length < 25) previousQuestions.push(q.trim());
    if (r && r.trim() && previousReframes.length < 25) previousReframes.push(r.trim());
  }
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
// Phase 2 Prompt
// ============================================================================

function buildResponsePrompt(
  analysis: AnalysisResult,
  previousQuestions: string[] = [],
  previousReframes: string[] = [],
  originalTrigger: string = '',
  turnCount: number = 1,
  userRevealedCoreBelief: boolean = false,
  coreBeliefJustDetected: boolean = false,
  groundingMode: boolean = false,
  intent: UserIntent = 'AUTO'
): string {
  const questionsWarning = previousQuestions.length > 0
    ? `\n\n⚠️ QUESTIONS YOU'VE ALREADY ASKED - NEVER REPEAT OR PARAPHRASE:\n${previousQuestions
        .slice(0, 10)
        .map(q => `- "${q}"`)
        .join('\n')}`
    : '';

  const reframesWarning = previousReframes.length > 0
    ? `\n\n⚠️ REFRAMES YOU'VE ALREADY USED - NEVER REPEAT OR PARAPHRASE:\n${previousReframes
        .slice(0, 8)
        .map(r => `- "${r}"`)
        .join('\n')}`
    : '';

  const triggerReminder = originalTrigger ? `\n\n🎯 ORIGINAL TRIGGER: "${originalTrigger}"` : '';
  const intentBlock = intentGuidance(intent);

  if (groundingMode) {
    return `You are a deeply emotionally intelligent FRIEND. The user asked for something grounding or comforting.

${intentBlock}

Return ONLY valid JSON:

{
  "acknowledgment": "Brief, warm. No cognitive analysis. Just presence.",
  "thoughtPattern": "",
  "patternNote": "",
  "reframe": "Gentle, practical. Present-moment. Sensory if helpful.",
  "question": "Optional simple present-moment question, or empty string.",
  "encouragement": "Optional, natural (no motivational poster lines)."
}

STYLE RULES:
- NO distortion labels
- NO deep probing
- Keep it human and specific, not templated.`;
  }

  const effectiveLayer: EffectiveLayer = userRevealedCoreBelief
    ? 'CORE_WOUND'
    : turnCount <= 2
      ? 'SURFACE'
      : turnCount <= 4
        ? 'TRANSITION'
        : turnCount <= 6
          ? 'EMOTION'
          : 'CORE_WOUND';

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
- question is OPTIONAL (prefer "" if unsure).
- Avoid clichés and motivational poster language.`;
  }

  return `You are a deeply emotionally intelligent FRIEND. Not a therapist. Not a coach.

${triggerReminder}

${intentBlock}

YOUR ANALYSIS (beneath the words):
- What happened: ${analysis.trigger_event}
- Their interpretation: ${analysis.likely_interpretation}
- The fear underneath: ${analysis.underlying_fear}
- What they need: ${analysis.emotional_need}
- The wound this touches: ${analysis.core_wound}

${questionsWarning}${reframesWarning}
${layerGuidance}

Return ONLY valid JSON:

{
  "acknowledgment": "Specific, grounded, human. Avoid canned empathy.",
  "thoughtPattern": "CORE WOUND: must be 'Core Belief'. Otherwise: pattern name OR empty string.",
  "patternNote": "Brief. CORE WOUND: one sentence max.",
  "reframe": "Fresh angle, specific to their situation. If intent=NEXT_STEP, include a tiny plan (1–3 steps) inside reframe.",
  "question": "ONE question max. Can be empty string.",
  "encouragement": "Optional, natural, NOT generic."
}

STYLE RULES:
- Do not force anxiety framing. Respond to the actual content.
- If the message is mostly factual (deadline, tasks), do NOT force a distortion label.
- Avoid repeating questions/reframes from warnings.
- Avoid: "I hear you", "you’re not alone", "storm inside", "weather this storm", etc.`;
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
// Output Quality: detect generic/templated responses + regenerate
// ============================================================================

function isGenericLine(s: string): boolean {
  const t = normalizeForCompare(s);
  if (!t) return true;

  const generic = [
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
    'you’re not alone',
    'storm inside',
    'weather this storm',
  ];

  if (t.length < 12) return true;
  return generic.some(g => t.includes(g));
}

function needsRegeneration(
  out: { acknowledgment?: string; reframe?: string; encouragement?: string; question?: string },
  previousReframes: string[],
  previousQuestions: string[]
): boolean {
  const q = (out.question || '').trim();
  const r = (out.reframe || '').trim();
  const e = (out.encouragement || '').trim();

  if (q && isDuplicateQuestion(q, previousQuestions)) return true;
  if (r && isDuplicateReframe(r, previousReframes)) return true;

  // If reframe/encouragement are generic, regenerate
  if (isGenericLine(r)) return true;
  if (e && isGenericLine(e)) return true;

  // If reframe missing, regenerate
  if (!r) return true;

  return false;
}

async function regenerateFieldsFresh(
  analysis: AnalysisResult,
  userText: string,
  previousQuestions: string[],
  previousReframes: string[],
  intent: UserIntent,
  groundingMode: boolean,
  effectiveLayer: EffectiveLayer
): Promise<Record<string, unknown> | null> {
  const regenPrompt = `
You are writing as a deeply emotionally intelligent FRIEND.

User message: "${userText}"

Intent: ${intent}
Layer: ${effectiveLayer}
Grounding mode: ${groundingMode ? 'true' : 'false'}

What happened: ${analysis.trigger_event}
Fear underneath: ${analysis.underlying_fear}
Need: ${analysis.emotional_need}

DO NOT reuse or lightly paraphrase any of these questions:
${previousQuestions.slice(0, 25).map(q => `- ${q}`).join('\n') || '- (none)'}

DO NOT reuse or lightly paraphrase any of these reframes:
${previousReframes.slice(0, 25).map(r => `- ${r}`).join('\n') || '- (none)'}

Hard rules:
- Sound natural and situation-specific. No therapy clichés. No motivational poster lines.
- Don’t force anxiety framing if it’s about work/deadlines/etc.
- Distortion labels ONLY if clearly present and actually helpful; otherwise set thoughtPattern to "".
- If intent is NEXT_STEP, put a tiny plan (1–3 steps) inside the reframe.
- Ask at most ONE question, only if it genuinely helps.
- Return ONLY valid JSON.

JSON:
{
  "acknowledgment": "...",
  "thoughtPattern": "",
  "patternNote": "",
  "reframe": "...",
  "question": "",
  "encouragement": ""
}
`.trim();

  const msgs: AIMessage[] = [{ role: 'system', content: regenPrompt }];
  const res = await callAI(msgs);
  if (!res?.content) return null;
  return parseAIJSON(res.content);
}

// ============================================================================
// Ensure ALL fields (with less template-y fallback behavior)
// ============================================================================

function ensureAllLayers(
  parsed: Record<string, unknown>,
  analysis: AnalysisResult,
  effectiveLayer: EffectiveLayer,
  userText: string,
  previousReframes: string[],
  previousQuestions: string[],
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

  // Acknowledgment: light variety (but not required every time)
  const acknowledgmentOptions = effectiveLayer === 'CORE_WOUND'
    ? [
        `Ouch. That’s heavy to carry.`,
        `That cuts deep.`,
        `That’s a painful place to be — and you’re naming it.`,
        snippetIsShort ? `"${snippet}" — yeah. That hurts.` : `I get why this feels so sharp.`,
      ]
    : [
        `Okay.`,
        `Yeah — that makes sense.`,
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

  const priorNotesPool = [...previousQuestions, ...previousReframes];
  let fallbackPatternNote = patternNoteOptions[Math.floor(Math.random() * patternNoteOptions.length)];
  if (fallbackPatternNote && isDuplicatePatternNote(fallbackPatternNote, priorNotesPool)) {
    const alt = patternNoteOptions.find(n => n && !isDuplicatePatternNote(n, priorNotesPool));
    if (alt) fallbackPatternNote = alt;
  }

  const inferredFallbackPattern = groundingMode ? '' : inferFallbackThoughtPattern(userText, effectiveLayer);

  const coreWound = (analysis.core_wound || '').toLowerCase();
  const underlyingFear = (analysis.underlying_fear || '').toLowerCase();
  const isAbandonment = coreWound.includes('love') || coreWound.includes('alon') ||
                        underlyingFear.includes('love') || underlyingFear.includes('alon');
  const isFailure = coreWound.includes('fail') || coreWound.includes('enough') ||
                    underlyingFear.includes('fail') || underlyingFear.includes('enough');

  const fallbackReframeOptions = effectiveLayer === 'CORE_WOUND'
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

  // ✅ Big change: stop forcing canned questions (silence by default)
  const fallbackQuestion = '';

  // ✅ Big change: stop forcing canned encouragement (silence by default)
  const fallbackEncouragement = groundingMode ? `Taking care of yourself is valid.` : '';

  const acknowledgment =
    typeof parsed.acknowledgment === 'string' && parsed.acknowledgment.trim()
      ? parsed.acknowledgment
      : fallbackAcknowledgment;

  // Thought pattern: allow blank when it doesn’t fit (esp CALM/LISTEN)
  let thoughtPattern: string;

  const rawPatternCandidate =
    normalizeThoughtPattern((parsed.thoughtPattern as string) || (parsed.distortionType as string)) ||
    inferredFallbackPattern;

  if (groundingMode) {
    thoughtPattern = '';
  } else if (effectiveLayer === 'CORE_WOUND') {
    thoughtPattern = frozenThoughtPattern ? normalizeThoughtPattern(frozenThoughtPattern) : 'Core Belief';
  } else {
    const aiProvidedPattern =
      typeof parsed.thoughtPattern === 'string' && parsed.thoughtPattern.trim()
        ? normalizeThoughtPattern(parsed.thoughtPattern)
        : typeof parsed.distortionType === 'string' && parsed.distortionType.trim()
          ? normalizeThoughtPattern(parsed.distortionType)
          : '';

    if ((intent === 'CALM' || intent === 'LISTEN') && !aiProvidedPattern) {
      thoughtPattern = '';
    } else if (previousDistortion && previousDistortion !== 'Core Belief') {
      const previousIsSimilar =
        (previousDistortion === 'Labeling' && /(i am|i'm|i feel like i'm)/i.test(userText)) ||
        (previousDistortion === 'Catastrophizing' && /\b(worst|ruin|disaster|end|fired)\b/i.test(userText)) ||
        (previousDistortion === 'All-or-nothing thinking' && /\b(always|never|everything|nothing|either|only|completely|totally)\b/i.test(userText));

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
    (parsed.patternNote as string) ||
    (parsed.distortionExplanation as string) ||
    fallbackPatternNote;

  if (!groundingMode) {
    patternNote =
      effectiveLayer === 'CORE_WOUND'
        ? compactOneSentence(patternNote) || fallbackPatternNote
        : compactTwoSentences(patternNote) || fallbackPatternNote;
  } else {
    patternNote = '';
  }

  // Reframe sanitization
  let reframe = (parsed.reframe as string) || fallbackReframe;
  reframe = sanitizeReframeAllLayers(reframe, previousReframes, analysis, effectiveLayer);

  // If duplicate reframe, keep it short and non-cliché (still avoid big template pools)
  if (isDuplicateReframe(reframe, previousReframes)) {
    reframe = groundingMode
      ? `Let’s take one small breath here.`
      : `Let’s pause for a second — this is feeling more final than it actually is.`;
  }

  // Question handling (silence by default; only keep if model provided and passes rules)
  const questionValue = parsed.question as string | undefined;
  const rawQuestion =
    typeof questionValue === 'string' ? questionValue.trim() : fallbackQuestion;

  const finalRawQuestion =
    (intent === 'LISTEN' || intent === 'CALM') &&
    (!questionValue || !String(questionValue).trim())
      ? ''
      : rawQuestion;

  const question = finalizeQuestion(
    finalRawQuestion,
    effectiveLayer,
    userText,
    previousQuestions,
    groundingMode,
    lastQuestionType
  );

  const encouragement =
    typeof parsed.encouragement === 'string' && parsed.encouragement.trim()
      ? parsed.encouragement
      : fallbackEncouragement;

  return {
    acknowledgment: String(acknowledgment),
    thoughtPattern: String(thoughtPattern),
    patternNote: String(patternNote),
    reframe: String(reframe),
    question: question ?? '',
    encouragement: String(encouragement),

    // Back-compat fields
    content: String(acknowledgment),
    distortionType: String(thoughtPattern),
    distortionExplanation: String(patternNote),
    probingQuestion: question ?? '',
    icebergLayer: String(icebergLayer),
    layerInsight: String(analysis.core_wound || analysis.underlying_fear || ''),
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const clientId = userId || getClientIdentifier(request);

    const rateLimit = checkRateLimit(clientId, 'reframe');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    const body = await request.json();
    const { userMessage, conversationHistory = [], sessionContext } = body as {
      userMessage: string;
      conversationHistory?: ChatMessage[];
      sessionContext?: SessionContext;
    };

    const validation = validateThought(userMessage);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const sanitizedMessage = validation.sanitized;

    // Crisis detection
    const crisisCheck = checkCrisisKeywords(sanitizedMessage);
    if (crisisCheck.level === SEVERITY_LEVELS.HIGH) {
      return NextResponse.json({
        acknowledgment: "You're sharing something really serious, and I want to make sure you get the right support.",
        thoughtPattern: 'Crisis Response',
        patternNote: 'Right now your safety is the priority.',
        reframe: "This moment doesn't define you. There are people trained to help.",
        question: 'Would you like me to connect you with someone who can help right now?',
        encouragement: generateCrisisResponse(SEVERITY_LEVELS.HIGH),
        probingQuestion: "Would you like to talk about what's bringing these feelings up?",
        icebergLayer: 'surface',
        layerInsight: 'Your safety matters most right now.',
        _isCrisisResponse: true,
      });
    }

    const turnCount = Math.floor(conversationHistory.length / 2) + 1;

    // Resolve intent (Reflect-only)
    const intent = resolveIntent(sessionContext);

    // Grounding mode
    const { groundingMode, groundingTurns } = isInGroundingMode(sessionContext, sanitizedMessage);

    // Phase 1: Analysis
    const analysisMessages: AIMessage[] = [{ role: 'system', content: buildAnalysisPrompt() }];

    if (conversationHistory.length > 0) {
      conversationHistory.slice(-6).forEach(msg => {
        analysisMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content || '' });
      });
    }
    analysisMessages.push({ role: 'user', content: sanitizedMessage });

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

    // Phase 2: Response
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

    const userRevealedCoreBelief = coreBeliefPatterns.some(p => p.test(sanitizedMessage));

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
    hydrateMemoryFromHistory(conversationHistory, previousQuestions, previousReframes);

    const originalTrigger =
      sessionContext?.originalTrigger ??
      conversationHistory.find(m => m.role === 'user')?.content ??
      '';

    const coreBeliefJustDetected =
      userRevealedCoreBelief && !sessionContext?.coreBeliefAlreadyDetected;

    const previousDistortion = sessionContext?.previousDistortions?.[0];

    const lastQuestion = sessionContext?.previousQuestions?.[0] || '';
    const lastQuestionType: 'choice' | 'open' | '' =
      isChoiceQuestionText(lastQuestion) ? 'choice' : lastQuestion ? 'open' : '';

    const frozenThoughtPattern =
      effectiveLayer === 'CORE_WOUND'
        ? normalizeThoughtPattern(sessionContext?.previousDistortions?.[0] ?? 'Core Belief')
        : undefined;

    const responseMessages: AIMessage[] = [
      {
        role: 'system',
        content: buildResponsePrompt(
          analysis,
          previousQuestions,
          previousReframes,
          originalTrigger,
          turnCount,
          userRevealedCoreBelief,
          coreBeliefJustDetected,
          groundingMode,
          intent
        ),
      },
    ];

    if (conversationHistory.length > 0) {
      conversationHistory.slice(-6).forEach(msg => {
        responseMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content || '' });
      });
    }
    responseMessages.push({ role: 'user', content: sanitizedMessage });

    let responseResult = await callAI(responseMessages);
    if (!responseResult?.content) responseResult = await callAI(responseMessages);

    // If model failed completely, try a fresh regen once before falling back
    if (!responseResult?.content) {
      const regenParsed = await regenerateFieldsFresh(
        analysis,
        sanitizedMessage,
        previousQuestions,
        previousReframes,
        intent,
        groundingMode,
        effectiveLayer
      );

      const fallbackResponse = ensureAllLayers(
        regenParsed || {},
        analysis,
        effectiveLayer,
        sanitizedMessage,
        previousReframes,
        previousQuestions,
        frozenThoughtPattern,
        previousDistortion,
        groundingMode,
        lastQuestionType,
        intent
      );

      const effectiveTurnForProgress = userRevealedCoreBelief ? Math.max(turnCount, 7) : turnCount;

      return NextResponse.json({
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
        _meta: { provider: 'fallback', turn: turnCount, effectiveLayer, intent },
      });
    }

    const parsed = parseAIJSON(responseResult.content);
    let completeResponse = ensureAllLayers(
      parsed || {},
      analysis,
      effectiveLayer,
      sanitizedMessage,
      previousReframes,
      previousQuestions,
      frozenThoughtPattern,
      previousDistortion,
      groundingMode,
      lastQuestionType,
      intent
    );

    // ✅ If repetitive/generic, regenerate fresh fields with the model (no canned fallback pools)
    if (
      needsRegeneration(
        {
          acknowledgment: String((completeResponse as any).acknowledgment || ''),
          reframe: String((completeResponse as any).reframe || ''),
          encouragement: String((completeResponse as any).encouragement || ''),
          question: String((completeResponse as any).question || ''),
        },
        previousReframes,
        previousQuestions
      )
    ) {
      const regenParsed = await regenerateFieldsFresh(
        analysis,
        sanitizedMessage,
        previousQuestions,
        previousReframes,
        intent,
        groundingMode,
        effectiveLayer
      );

      if (regenParsed) {
        completeResponse = ensureAllLayers(
          regenParsed,
          analysis,
          effectiveLayer,
          sanitizedMessage,
          previousReframes,
          previousQuestions,
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

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to process thought' }, { status: 500 });
  }
}
