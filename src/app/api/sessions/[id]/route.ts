import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type UserIntent = 'AUTO' | 'CALM' | 'CLARITY' | 'NEXT_STEP' | 'MEANING' | 'LISTEN';
type QuestionType = 'choice' | 'open' | '';

function normalizeForCompare(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniqRecent(items: string[], limit = 25): string[] {
  // keeps the first occurrence (so: if you pass newest-first, you keep newest)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    const n = normalizeForCompare(x);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(x);
    if (out.length >= limit) break;
  }
  return out;
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

function computeSessionContext(session: any) {
  const messages = (session?.messages ?? []) as any[];

  // Messages are fetched ASC; we want newest-first for "recent memory"
  const assistantMsgs = messages
    .filter(m => m.role === 'assistant')
    .slice(-30) // grab a bit more then reverse for recency
    .reverse()
    .slice(0, 20);

  const userMsgs = messages.filter(m => m.role === 'user');

  const previousQuestions: string[] = [];
  const previousReframes: string[] = [];
  const previousDistortions: string[] = [];
  const previousAcknowledgments: string[] = [];
  const previousEncouragements: string[] = [];

  for (const m of assistantMsgs) {
    if (typeof m.question === 'string' && m.question.trim()) previousQuestions.push(m.question.trim());
    if (typeof m.reframe === 'string' && m.reframe.trim()) previousReframes.push(m.reframe.trim());
    if (typeof m.thoughtPattern === 'string' && m.thoughtPattern.trim())
      previousDistortions.push(m.thoughtPattern.trim());
    if (typeof m.acknowledgment === 'string' && m.acknowledgment.trim())
      previousAcknowledgments.push(m.acknowledgment.trim());
    if (typeof m.encouragement === 'string' && m.encouragement.trim())
      previousEncouragements.push(m.encouragement.trim());
  }

  const originalTrigger =
    typeof session?.originalTrigger === 'string' && session.originalTrigger.trim()
      ? session.originalTrigger.trim()
      : (typeof userMsgs?.[0]?.content === 'string' ? userMsgs[0].content : '') || '';

  // Since arrays are now newest-first, the "last question asked" is index 0
  const lastQuestion = previousQuestions[0] || '';
  const lastQuestionType: QuestionType = isChoiceQuestionText(lastQuestion)
    ? 'choice'
    : lastQuestion
      ? 'open'
      : '';

  return {
    previousQuestions: uniqRecent(previousQuestions, 25),
    previousReframes: uniqRecent(previousReframes, 25),
    previousDistortions: uniqRecent(previousDistortions, 10),
    previousAcknowledgments: uniqRecent(previousAcknowledgments, 25),
    previousEncouragements: uniqRecent(previousEncouragements, 25),

    originalTrigger,

    groundingMode: !!session?.groundingMode,
    groundingTurns: Number.isFinite(session?.groundingTurns) ? session.groundingTurns : 0,

    lastQuestionType,
    coreBeliefAlreadyDetected: !!session?.coreBeliefAlreadyDetected,

    userIntent: (session?.lastIntentUsed as UserIntent) || 'AUTO',
  };
}

// GET a specific session (+ sessionContext)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } } // ✅ FIXED (not a Promise)
) {
  try {
    const { userId } = await auth();
    const { id } = params;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const session = await db.session.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,

            // structured fields (needed for memory + analytics)
            acknowledgment: true,
            thoughtPattern: true,
            patternNote: true,
            reframe: true,
            question: true,
            encouragement: true,
            icebergLayer: true,
            layerInsight: true,
            meta: true,
          },
        },
      },
    });

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    return NextResponse.json({
      session,
      sessionContext: computeSessionContext(session),
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PUT update a session (engine state)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } } // ✅ FIXED
) {
  try {
    const { userId } = await auth();
    const { id } = params;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json();

    const {
      summary,
      distortions,
      isCompleted,

      currentLayer,
      coreBelief,
      coreBeliefAlreadyDetected,
      lastQuestionType,
      groundingMode,
      groundingTurns,
      lastIntentUsed,
      originalTrigger,
    } = body as {
      summary?: string | null;
      distortions?: string[] | null;
      isCompleted?: boolean;

      currentLayer?: string | null;
      coreBelief?: string | null;
      coreBeliefAlreadyDetected?: boolean;
      lastQuestionType?: QuestionType;
      groundingMode?: boolean;
      groundingTurns?: number;
      lastIntentUsed?: UserIntent;
      originalTrigger?: string | null;
    };

    // ✅ Ensure session belongs to this user
    const existing = await db.session.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const updated = await db.session.update({
      where: { id },
      data: {
        summary: summary === undefined ? undefined : summary,
        distortions: distortions === undefined ? undefined : distortions,
        isCompleted: isCompleted === undefined ? undefined : isCompleted,
    
        currentLayer: currentLayer === undefined ? undefined : currentLayer,
        coreBelief: coreBelief === undefined ? undefined : coreBelief,
        coreBeliefAlreadyDetected:
          coreBeliefAlreadyDetected === undefined ? undefined : !!coreBeliefAlreadyDetected,
        lastQuestionType: lastQuestionType === undefined ? undefined : lastQuestionType,
        groundingMode: groundingMode === undefined ? undefined : !!groundingMode,
        groundingTurns: groundingTurns === undefined ? undefined : Math.max(0, Number(groundingTurns) || 0),
        lastIntentUsed: lastIntentUsed === undefined ? undefined : lastIntentUsed,
        // Removed: originalTrigger and lastUpdatedAt - not in schema
        // updatedAt is auto-managed by Prisma
      },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE a session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } } // ✅ FIXED
) {
  try {
    const { userId } = await auth();
    const { id } = params;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.session.deleteMany({ where: { id, userId: user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
