// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Role = 'user' | 'assistant';

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return json(200, {});
}

function safeParseJSON(maybeJson: unknown): any | null {
  if (typeof maybeJson !== 'string') return null;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function isObject(v: any): v is Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function toIntOrUndefined(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

function toBoolOrUndefined(v: any): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function toStringOrUndefined(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

// POST add a message to a session
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return json(401, { error: 'Unauthorized' });

    const body = await request.json();

    const sessionId: string | undefined = body?.sessionId;
    const role: Role | undefined = body?.role;
    const incomingContent: string | undefined = body?.content;

    if (!sessionId || !role || !incomingContent) {
      return json(400, { error: 'Missing required fields: sessionId, role, content' });
    }

    if (role !== 'user' && role !== 'assistant') {
      return json(400, { error: 'Invalid role. Must be user or assistant.' });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return json(404, { error: 'User not found' });

    // Verify session belongs to user
    const session = await db.session.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });

    if (!session) {
      return json(404, { error: 'Session not found' });
    }

    // ----------------------------------------------------------------------
    // Align with reframe/route.ts:
    // - Accept either flat fields OR a JSON string in `content`
    // - Persist structured fields for analytics
    // - For assistant messages, ALSO store `content` as full JSON string,
    //   because reframe/route.ts hydrates memory by parsing assistant.content
    // ----------------------------------------------------------------------

    const contentJson = safeParseJSON(incomingContent);
    const payloadFromContent = isObject(contentJson) ? contentJson : null;

    // Prefer explicit fields; fallback to parsed JSON from content if present
    const acknowledgment =
      body?.acknowledgment ??
      payloadFromContent?.acknowledgment ??
      payloadFromContent?.content ??
      (role === 'assistant' ? incomingContent : undefined); // if assistant sent plain text, treat it as ack

    const thoughtPattern =
      body?.thoughtPattern ??
      payloadFromContent?.thoughtPattern ??
      body?.distortionType ??
      payloadFromContent?.distortionType;

    const patternNote =
      body?.patternNote ??
      payloadFromContent?.patternNote ??
      body?.distortionExplanation ??
      payloadFromContent?.distortionExplanation;

    const reframe = body?.reframe ?? payloadFromContent?.reframe;

    const question =
      body?.question ??
      payloadFromContent?.question ??
      body?.probingQuestion ??
      payloadFromContent?.probingQuestion;

    const encouragement = body?.encouragement ?? payloadFromContent?.encouragement;

    const icebergLayer = body?.icebergLayer ?? payloadFromContent?.icebergLayer;
    const layerInsight = body?.layerInsight ?? payloadFromContent?.layerInsight;

    const progressScore = body?.progressScore ?? payloadFromContent?.progressScore;
    const layerProgress = body?.layerProgress ?? payloadFromContent?.layerProgress;

    const groundingMode = body?.groundingMode ?? payloadFromContent?.groundingMode;
    const groundingTurns = body?.groundingTurns ?? payloadFromContent?.groundingTurns;

    const isCrisisResponse = body?._isCrisisResponse ?? payloadFromContent?._isCrisisResponse;

    // Meta: accept `_meta` (from reframe route) or `meta`
    const meta =
      (body?._meta ??
        body?.meta ??
        payloadFromContent?._meta ??
        payloadFromContent?.meta) as Record<string, any> | undefined;

    // Base record
    const data: any = {
      sessionId,
      role,
      content: incomingContent, // user: plain text; assistant: overwritten below to JSON
      meta: meta ?? undefined,
    };

    if (role === 'assistant') {
      // Canonical structured object (matches reframe/route.ts response fields)
      const structured = {
        acknowledgment: toStringOrUndefined(acknowledgment) ?? '',
        thoughtPattern: toStringOrUndefined(thoughtPattern) ?? '',
        patternNote: toStringOrUndefined(patternNote) ?? '',
        reframe: toStringOrUndefined(reframe) ?? '',
        question: toStringOrUndefined(question) ?? '',
        encouragement: toStringOrUndefined(encouragement) ?? '',

        // Back-compat fields your engine/UI may still reference
        content: toStringOrUndefined(acknowledgment) ?? '',
        distortionType: toStringOrUndefined(thoughtPattern) ?? '',
        distortionExplanation: toStringOrUndefined(patternNote) ?? '',
        probingQuestion: toStringOrUndefined(question) ?? '',
        icebergLayer: toStringOrUndefined(icebergLayer) ?? '',
        layerInsight: toStringOrUndefined(layerInsight) ?? '',

        // Progress + grounding
        progressScore: toIntOrUndefined(progressScore),
        layerProgress: isObject(layerProgress) ? layerProgress : undefined,
        groundingMode: toBoolOrUndefined(groundingMode),
        groundingTurns: toIntOrUndefined(groundingTurns),

        _isCrisisResponse: !!isCrisisResponse,
        _meta: meta ?? undefined,
      };

      // ✅ CRITICAL: store assistant content as JSON so history hydration works
      data.content = JSON.stringify(structured);

      // Persist structured fields in columns for analytics/progress pages
      data.acknowledgment = structured.acknowledgment;
      data.thoughtPattern = structured.thoughtPattern;
      data.patternNote = structured.patternNote;
      data.reframe = structured.reframe;
      data.question = structured.question;
      data.encouragement = structured.encouragement;

      data.icebergLayer = structured.icebergLayer;
      data.layerInsight = structured.layerInsight;

      data.progressScore = structured.progressScore;
      data.layerProgress = structured.layerProgress;
      data.groundingMode = structured.groundingMode;
      data.groundingTurns = structured.groundingTurns;

      data.isCrisisResponse = structured._isCrisisResponse;

      // Keep legacy fields populated during migration
      data.distortionType = structured.distortionType;
      data.distortionExplanation = structured.distortionExplanation;
      data.probingQuestion = structured.probingQuestion;
    }

    const message = await db.message.create({ data });

    return json(200, { message });
  } catch (error) {
    console.error('Error creating message:', error);
    return json(500, { error: 'Failed to create message' });
  }
}
