// src/app/api/engine/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateThought } from '@/lib/input-validation';

// ✅ This is the engine core you just added:
import { runEngine, type UserIntent, type SessionContext } from '@/lib/engine/runEngine';

interface EngineRequestBody {
  text: string;
  session_context?: SessionContext & {
    // optional: buyers can pass extras without breaking
    sessionId?: string;
    turn?: number;
    meta?: Record<string, unknown>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EngineRequestBody;

    // Basic input checks
    if (!body?.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Missing "text" string.' }, { status: 400 });
    }

    // Reuse your existing sanitation/validation rules
    const validation = validateThought(body.text);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Call the “sellable engine” core
    const out = await runEngine({
      userMessage: validation.sanitized,
      conversationHistory: [], // external buyers can pass this later if you want; keep empty for now
      sessionContext: body.session_context ?? {},
    });

    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    console.error('Engine API error:', error);
    return NextResponse.json({ error: 'Failed to run engine.' }, { status: 500 });
  }
}
