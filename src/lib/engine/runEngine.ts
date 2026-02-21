// src/lib/engine/runEngine.ts
import { validateThought } from '@/lib/input-validation';
import {
  checkCrisisKeywords,
  generateCrisisResponse,
  SEVERITY_LEVELS,
} from '@/lib/crisis-detection';
import { callAI, type AIMessage } from '@/lib/ai-service';

// ============================================================================
// This is the shared "engine" core.
// - No NextRequest/NextResponse
// - No auth
// - No rate-limiting
// - Pure function you can call from /api/reframe AND /api/engine
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

  // optional/backwards-compatible
  previousAcknowledgments?: string[];
  previousEncouragements?: string[];

  originalTrigger?: string;
  coreBeliefAlreadyDetected?: boolean;
  groundingMode?: boolean;
  groundingTurns?: number;
  lastQuestionType?: 'choice' | 'open' | '';
  userIntent?: UserIntent;
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
  return floodIndicators.some((p) => s.includes(p));
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

function decideEngineState(
  userText: string,
  analysis: AnalysisResult,
  intent: UserIntent,
  groundingMode: boolean
): EngineDecision {
  const reasons: string[] = [];

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

  return {
    state: 'MAP',
    intervention: 'REFLECT_MAP',
    confidence: 0.65,
    reasons: [`distortionLikely=${distortionLikely.toFixed(2)} -> MAP`],
    askQuestion: true,
  };
}

// ============================================================================
// Intent + grounding helpers
// ============================================================================

function resolveIntent(sessionContext?: SessionContext): UserIntent {
  const i = sessionContext?.userIntent;
  if (!i) return 'AUTO';
  if (['AUTO', 'CALM', 'CLARITY', 'NEXT_STEP', 'MEANING', 'LISTEN'].includes(i)) return i;
  return 'AUTO';
}

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
    'coffee',
    'walk',
    'tea',
    'breathe',
    'small thing',
    'tiny step',
    'practical step',
  ];
  return groundingIndicators.some((p) => s.includes(p));
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
// JSON parsing
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
// Phase 1 + Phase 2 prompts (kept minimal; uses your existing approach)
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

function buildResponsePrompt(args: {
  analysis: AnalysisResult;
  userText: string;
  intent: UserIntent;
  groundingMode: boolean;
  decision: EngineDecision;
  effectiveLayer: EffectiveLayer;
  originalTrigger: string;
}): string {
  const { analysis, userText, intent, groundingMode, decision, effectiveLayer, originalTrigger } = args;

  // Keep it simple + structured; your existing route has tons of extra anti-template logic.
  // We are NOT removing your logic — we’re just putting a safe base prompt here.
  // Your route can still keep the heavy enforcement if you want later.
  return `
You are a premium CBT-based product voice: human, specific, non-templated.
You are NOT a therapy bot.

User message: "${userText}"

Intent: ${intent}
Layer: ${effectiveLayer}
Grounding mode: ${groundingMode ? 'true' : 'false'}

ENGINE STATE: ${decision.state}
INTERVENTION: ${decision.intervention}
AskQuestion: ${decision.askQuestion ? 'true' : 'false'}

Original trigger: "${originalTrigger}"

Analysis:
- What happened: ${analysis.trigger_event}
- Interpretation: ${analysis.likely_interpretation}
- Fear: ${analysis.underlying_fear}
- Need: ${analysis.emotional_need}
- Core wound: ${analysis.core_wound || ''}

Return ONLY valid JSON:
{
  "acknowledgment": "specific and human",
  "thoughtPattern": "",
  "patternNote": "",
  "reframe": "state-appropriate response (if TINY_PLAN, include 1-3 steps)",
  "question": "",
  "encouragement": "",
  "icebergLayer": "surface|trigger|emotion|coreBelief",
  "layerInsight": ""
}

Rules:
- If REGULATE: no labels, no questions.
- If PRESENCE: validate + mirror, no advice.
- If AskQuestion=false: question must be empty.
- Avoid generic therapy clichés.
`.trim();
}

// ============================================================================
// MAIN PUBLIC FUNCTION
// ============================================================================

export async function runEngine(input: {
  userMessage: string;
  conversationHistory?: ChatMessage[];
  sessionContext?: SessionContext;
}): Promise<Record<string, unknown>> {
  const { userMessage, conversationHistory = [], sessionContext } = input;

  // Validate input
  const validation = validateThought(userMessage);
  if (!validation.valid) {
    // routes can catch + return 400
    throw new Error(validation.error || 'Invalid input');
  }
  const sanitizedMessage = validation.sanitized;

  // Crisis detection
  const crisisCheck = checkCrisisKeywords(sanitizedMessage);
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
    };
  }

  const turnCount = Math.floor(conversationHistory.length / 2) + 1;

  // Resolve intent + grounding mode
  const intent = resolveIntent(sessionContext);
  const { groundingMode, groundingTurns } = isInGroundingMode(sessionContext, sanitizedMessage);

  // Phase 1: analysis
  const analysisMessages: AIMessage[] = [{ role: 'system', content: buildAnalysisPrompt() }];
  if (conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach((msg) => {
      analysisMessages.push({ role: msg.role, content: msg.content || '' });
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

  // Detect core belief + layer
  const coreBeliefPatterns = [
    /i am not (built|made|cut out|good|smart|capable|worthy|enough|lovable|deserving)/i,
    /i'm not (built|made|cut out|good|smart|capable|worthy|enough|lovable|deserving)/i,
    /i am (a failure|worthless|hopeless|broken|fraud|burden|loser|mess|disappointment|undesirable)/i,
    /i'm (a failure|worthless|hopeless|broken|fraud|burden|loser|mess|disappointment|undesirable)/i,
    /i will never (be|find|get|have|become|amount)/i,
    /i'?ll never (be|find|get|have|become|amount)/i,
  ];
  const userRevealedCoreBelief = coreBeliefPatterns.some((p) => p.test(sanitizedMessage));

  const effectiveLayer: EffectiveLayer = userRevealedCoreBelief
    ? 'CORE_WOUND'
    : turnCount <= 2
      ? 'SURFACE'
      : turnCount <= 4
        ? 'TRANSITION'
        : turnCount <= 6
          ? 'EMOTION'
          : 'CORE_WOUND';

  // Deterministic decision
  const decision = decideEngineState(sanitizedMessage, analysis, intent, groundingMode);

  const originalTrigger =
    sessionContext?.originalTrigger ?? conversationHistory.find((m) => m.role === 'user')?.content ?? '';

  // Phase 2: response
  const responsePrompt = buildResponsePrompt({
    analysis,
    userText: sanitizedMessage,
    intent,
    groundingMode,
    decision,
    effectiveLayer,
    originalTrigger,
  });

  const responseMessages: AIMessage[] = [{ role: 'system', content: responsePrompt }];
  if (conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach((msg) => {
      responseMessages.push({ role: msg.role, content: msg.content || '' });
    });
  }
  responseMessages.push({ role: 'user', content: sanitizedMessage });

  let responseResult = await callAI(responseMessages);
  if (!responseResult?.content) responseResult = await callAI(responseMessages);

  const parsed = responseResult?.content ? parseAIJSON(responseResult.content) : null;

  // Minimal safe output if model returns junk
  const icebergLayer =
    effectiveLayer === 'SURFACE'
      ? 'surface'
      : effectiveLayer === 'TRANSITION'
        ? 'trigger'
        : effectiveLayer === 'EMOTION'
          ? 'emotion'
          : 'coreBelief';

  const acknowledgment =
    (parsed?.acknowledgment as string) ||
    'Thanks for sharing that.';

  const question = decision.askQuestion ? ((parsed?.question as string) || '').trim() : '';

  const progressTurn = userRevealedCoreBelief ? Math.max(turnCount, 7) : turnCount;
  const progressScore = Math.min(progressTurn * 12, 100);
  const layerProgress = {
    surface: Math.min(progressTurn * 25, 100),
    trigger: Math.min(Math.max(0, progressTurn - 1) * 30, 100),
    emotion: Math.min(Math.max(0, progressTurn - 2) * 35, 100),
    coreBelief: userRevealedCoreBelief
      ? 60
      : Math.min(Math.max(0, progressTurn - 4) * 30, 100),
  };

  return {
    acknowledgment,
    thoughtPattern: (parsed?.thoughtPattern as string) || (parsed?.distortionType as string) || '',
    patternNote: (parsed?.patternNote as string) || (parsed?.distortionExplanation as string) || '',
    reframe: (parsed?.reframe as string) || '',
    question,
    encouragement: (parsed?.encouragement as string) || '',
    probingQuestion: question,
    icebergLayer,
    layerInsight: (parsed?.layerInsight as string) || analysis.core_wound || analysis.underlying_fear || '',

    groundingMode,
    groundingTurns,

    progressScore,
    layerProgress,

    _meta: {
      provider: responseResult?.provider,
      model: responseResult?.model,
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
