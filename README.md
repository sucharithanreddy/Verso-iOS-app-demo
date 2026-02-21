# The Optimism Engine

AI-Powered Cognitive Reflection Engine (Production-Ready SaaS)

A full-stack SaaS application and structured cognitive engine that guides users through AI-powered CBT-style reflection conversations using deterministic state routing and multi-provider AI infrastructure.

🎯 What This Is

The Optimism Engine is a production-ready cognitive reframing platform built on a structured “reflection engine” architecture.

Users share a negative thought. The system:

Analyzes underlying interpretation, fear, and emotional need

Routes the response through a deterministic cognitive state machine

Applies CBT-informed restructuring logic

Prevents repetition and templated output

Returns structured JSON suitable for UI or API integrations

This is not just a prompt wrapper.
It is a layered engine with:

Deterministic intervention routing

Anti-duplication safeguards

Regeneration logic

Multi-provider AI failover

Structured output contract

🧠 Core Engine Architecture

At the center is:

runEngine()
Engine Flow
User Input
   ↓
Crisis Detection Layer
   ↓
Phase 1: Emotional Analysis (AI)
   ↓
Deterministic State Router
   ↓
Phase 2: Structured Response Generation
   ↓
Anti-duplicate & Regeneration Layer
   ↓
Output Sanitization
   ↓
Structured JSON Response
Cognitive States

The engine dynamically routes responses into:

REGULATE (grounding / stabilization)

CLARIFY (facts vs story separation)

MAP (interpretation → fear → need)

RESTRUCTURE (CBT distortion correction)

PLAN (tiny-step action conversion)

PRESENCE (reflect-only listening)

Routing is rule-based, not random.

🧊 Iceberg Reflection Model

Progressive conversational layers:

Surface

Trigger

Emotion

Core Belief

Layer progression is tracked per session and influences response style.

🔁 Anti-Template Safeguards

The engine includes:

Exact duplicate blocking

Near-duplicate detection (Jaccard similarity)

Generic phrase detection

Regeneration pass if output is low-quality

Candidate filtering and selection

Prefix sanitization (removes “Candidate #1”, etc.)

Question suppression in stabilization states

This prevents repetitive or generic AI output across sessions.

🤖 Multi-Provider AI Layer

Supported providers:

OpenAI

Anthropic

Mistral

Groq

Gemini

DeepSeek

Together AI

OpenRouter

Z.AI SDK (default fallback)

Features:

Automatic failover

Structured JSON enforcement

Provider metadata returned in _meta

No hardcoded API dependencies

👤 User Features

Clerk authentication (Google / Email)

Session history

Persistent message storage

Progress scoring

Iceberg layer tracking

Mobile-responsive UI

Exportable conversation logs

🛠 Tech Stack
Layer	Technology
Frontend	Next.js 16, React 19, TypeScript
Styling	Tailwind CSS, Framer Motion
Backend	Next.js Route Handlers
Database	PostgreSQL (Neon) + Prisma
Auth	Clerk
Deploy	Vercel
📡 API Contract
POST /api/engine

Request:

{
  "text": "I feel nervous about my interview",
  "session_context": {
    "userIntent": "AUTO"
  }
}

Response:

{
  "acknowledgment": "...",
  "thoughtPattern": "Catastrophizing",
  "patternNote": "...",
  "reframe": "...",
  "question": "...",
  "encouragement": "...",
  "icebergLayer": "surface",
  "_meta": {
    "state": "PLAN",
    "intervention": "TINY_PLAN",
    "confidence": 0.78
  }
}

This endpoint is designed for:

SaaS integration

Mobile app embedding

White-label use

API resale

🗄 Database Schema

Core entities:

User

Session

Message

Messages store:

Distortion type

Reframe

Probing question

Encouragement

Iceberg layer

Structured metadata

Designed for longitudinal tracking.

🔒 Security & Data Handling

Environment-based secret management

No hardcoded API keys

Auth via Clerk

Hosted PostgreSQL (Neon)

Structured server-side validation

Clear separation between public UI and engine route

📦 What’s Included in Sale

Complete TypeScript source code

Unified runEngine() cognitive engine

Multi-provider AI abstraction layer

Anti-duplicate / regeneration safeguards

Database schema + migrations

Deployment configuration (Vercel)

Documentation

Optional post-sale support

💼 Ideal Buyers

Mental wellness SaaS founders

Journaling or productivity apps adding AI reflection

Corporate wellness startups

AI infra builders wanting a structured cognitive engine

Founders seeking a deploy-ready AI SaaS base

💰 Monetization Pathways

Potential expansions:

Subscription model

Corporate wellness licensing

Therapist dashboards

White-label licensing

API-based B2B licensing

Revenue strategy is not embedded — the engine is infrastructure-ready.

🚀 Deployment

Clone repository

Configure environment variables

Run Prisma migrations

Deploy to Vercel

Designed for production, not prototype demos.

📄 License

Proprietary.
Available for acquisition or licensing.
