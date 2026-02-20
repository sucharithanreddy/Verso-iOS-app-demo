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

    const session = await db.session.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!session) return json(404, { error: 'Session not found' });

    // ----------------------------------------------------------------------
    // Normalize payload to match reframe/route.ts outputs
    // - Accept either flat fields OR a JSON string in `content`
    // - Persist structured fields for analytics
    // - BUT: for assistant messages, ALSO store `content` as full JSON string
    //   because reframe/route.ts hydrates memory by parsing assistant.content
    // ----------------------------------------------------------------------

    const contentJson = safeParseJSON(incomingContent);
    const payloadFromContent = isObject(contentJson) ? contentJson : null;

    // Prefer explicit fields; fallback to parsed JSON from content if present
    const acknowledgment =
      body?.acknowledgment ?? payloadFromContent?.acknowledgment ?? body?.content ?? payloadFromContent?.content;

    const thoughtPattern = body?.thoughtPattern ?? payloadFromContent?.thoughtPattern ?? body?.distortionType ?? payloadFromContent?.distortionType;
    const patternNote = body?.patternNote ?? payloadFromContent?.patternNote ?? body?.distortionExplanation ?? payloadFromContent?.distortionExplanation;
    const reframe = body?.reframe ?? payloadFromContent?.reframe;
    const question = body?.question ?? payloadFromContent?.question ?? body?.probingQuestion ?? payloadFromContent?.probingQuestion;

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
      (body?._meta ?? body?.meta ?? payloadFromContent?._meta ?? payloadFromContent?.meta) as
        | Record<string, any>
        | undefined;

    // Base record
    const data: any = {
      sessionId,
      role,
      // default: store what came in
      content: incomingContent,
      meta: meta ?? undefined,
    };

    if (role === 'assistant') {
      // Build a canonical structured object exactly like reframe/route.ts returns.
      // This is what should be stored in content for history playback + memory hydration.
      const structured = {
        acknowledgment: acknowledgment ?? '',
        thoughtPattern: thoughtPattern ?? '',
        patternNote: patternNote ?? '',
        reframe: reframe ?? '',
        question: question ?? '',
        encouragement: encouragement ?? '',
        // back-compat fields your engine sometimes uses
        content: acknowledgment ?? '',
        distortionType: thoughtPattern ?? '',
        distortionExplanation: patternNote ?? '',
        probingQuestion: question ?? '',
        icebergLayer: icebergLayer ?? '',
        layerInsight: layerInsight ?? '',
        // progress + grounding
        progressScore: typeof progressScore === 'number' ? progressScore : undefined,
        layerProgress: isObject(layerProgress) ? layerProgress : undefined,
        groundingMode: typeof groundingMode === 'boolean' ? groundingMode : undefined,
        groundingTurns: typeof groundingTurns === 'number' ? groundingTurns : undefined,
        _isCrisisResponse: !!isCrisisResponse,
        _meta: meta ?? undefined,
      };

      // ✅ CRITICAL: content is JSON so reframe/route.ts can parse history
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
    }

    const message = await db.message.create({ data });

    return json(200, { message });
  } catch (error) {
    console.error('Error creating message:', error);
    return json(500, { error: 'Failed to create message' });
  }
}
