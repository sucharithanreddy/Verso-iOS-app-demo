import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmotion, type EmotionAnalysis } from '@/lib/emotion-analysis';
import { detectDistortions, type DistortionAnalysis } from '@/lib/distortion-detection';
import { checkCrisisKeywords, SEVERITY_LEVELS } from '@/lib/crisis-detection';

// ============================================================================
// COPILOT API - Decision Support System for Coaches
// Outputs behavioral guidance, not psychological analysis
// ============================================================================

export interface CopilotAnalysis {
  // BEHAVIORAL GUIDANCE - What to DO
  responseApproach: {
    action: string;        // "Start by validating feelings"
    dontDo: string;        // "Do NOT give advice yet"
  };
  
  // CONTEXT-AWARE REPLY DRAFT
  replyDraft: string;
  
  // ACTIONABLE PREDICTION
  whatToExpect: string;
  
  // PREDICTIVE GUIDANCE
  emotionalState: {
    intensity: 'Low' | 'Moderate' | 'High' | 'Severe';
    guidance: string;      // "Expect follow-up messages if response feels dismissive"
  };
  
  riskLevel: {
    level: 'None' | 'Distress' | 'Panic' | 'Shutdown';
    action: string;        // What to do about it
  };
  
  // WHY THE ASSISTANT THINKS THIS (collapsible)
  reasoning: {
    situationType: string;
    patterns: string[];
    primaryEmotion: string;
  };
}

// ============================================================================
// BEHAVIORAL GUIDANCE - Direct instructions, not labels
// ============================================================================

function getBehavioralGuidance(
  emotion: EmotionAnalysis,
  distortion: DistortionAnalysis,
  isSituation: boolean,
  riskLevel: string
): { action: string; dontDo: string } {
  // Crisis - immediate safety
  if (riskLevel === 'HIGH') {
    return {
      action: 'Prioritize emotional safety. Acknowledge the pain before anything else.',
      dontDo: 'Do NOT offer solutions, perspective, or cognitive work right now.'
    };
  }
  
  // High intensity emotion - validate first
  if (emotion.intensity === 'severe' || emotion.intensity === 'intense') {
    return {
      action: 'Start by validating their feelings. Match their emotional intensity with your presence.',
      dontDo: 'Do NOT give advice or try to "fix" anything yet - they can\'t absorb it.'
    };
  }
  
  // Self-criticism/labeling - counter the inner critic
  if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') {
    return {
      action: 'Gently challenge the self-judgment. Offer a kinder interpretation.',
      dontDo: 'Do NOT agree with their self-assessment or stay silent about it.'
    };
  }
  
  // Rumination - break the loop
  if (distortion.type === 'Rumination') {
    return {
      action: 'Acknowledge the loop, then offer ONE small grounding step.',
      dontDo: 'Do NOT ask "why" questions - they\'ll just spiral more.'
    };
  }
  
  // Relationship situation - explore, don't pathologize
  if (isSituation) {
    return {
      action: 'Ask about their experience of the situation, not their thinking about it.',
      dontDo: 'Do NOT label their reaction as a "distortion" - they\'re responding to real ambiguity.'
    };
  }
  
  // Clear distortion - gentle challenge
  if (distortion.confidence >= 2) {
    return {
      action: 'Offer an alternative perspective. "What if there\'s another way to see this?"',
      dontDo: 'Do NOT tell them they\'re "wrong" - that triggers defensiveness.'
    };
  }
  
  // Default - explore
  return {
    action: 'Get curious. Ask what feels most important to them right now.',
    dontDo: 'Do NOT assume you know what they need before they tell you.'
  };
}

// ============================================================================
// CONTEXT-AWARE REPLY DRAFTS - Uses detected patterns
// ============================================================================

function generateContextAwareReply(
  emotion: EmotionAnalysis,
  distortion: DistortionAnalysis,
  isSituation: boolean,
  riskLevel: string,
  message: string
): string {
  // Extract key phrases from message for context
  const keyPhrase = extractKeyPhrase(message);
  
  // Crisis response
  if (riskLevel === 'HIGH') {
    return `I hear how much you're hurting right now. What you're going through sounds incredibly heavy, and I want you to know I'm here. You don't have to carry this alone. Would it help to talk about what's feeling most overwhelming right now?`;
  }
  
  // High intensity - validate deeply
  if (emotion.intensity === 'severe' || emotion.intensity === 'intense') {
    if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') {
      return `I noticed you said "${keyPhrase}" - and I want to pause there. That sounds like your inner critic talking, not reality. Before we go further, I want you to know: feeling like you're drowning doesn't mean you're failing. It means you've been carrying something heavy for too long. What happened that made today feel like too much?`;
    }
    
    if (isSituation) {
      return `The hardest part here seems to be the uncertainty - not knowing where you stand. That ambiguity is emotionally exhausting in itself. Before we try to figure anything out, I want to understand: what part of this has been weighing on you the most?`;
    }
    
    return `What you're sharing sounds genuinely overwhelming. The fact that you're reaching out shows strength, even if it doesn't feel that way right now. Let's take this one piece at a time - what would help most in this moment?`;
  }
  
  // Self-criticism - counter the inner voice
  if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') {
    return `I keep coming back to "${keyPhrase}" - because that's a harsh judgment, not a fact. Would you say that to a friend who was going through what you're going through? Let's look at what actually happened, separate from what your mind is telling you about it.`;
  }
  
  // Rumination - break the loop
  if (distortion.type === 'Rumination') {
    return `It sounds like your mind has been circling this for a while. That loop is exhausting - and it usually means something underneath is asking for attention. What do you think this pattern is trying to tell you?`;
  }
  
  // Relationship situation - acknowledge the ambiguity
  if (isSituation) {
    return `What you're describing sounds like real uncertainty, not overthinking. When someone's behavior doesn't add up, the mind naturally tries to make sense of it. What would help you feel more clarity right now - talking through what happened, or exploring what you need?`;
  }
  
  // Clear distortion - gentle reframe
  if (distortion.confidence >= 2) {
    return `I hear what you're saying, and I'm also wondering - is it possible this situation could mean something different than it feels like right now? What would a close friend say about this same situation?`;
  }
  
  // Default exploration
  return `Thank you for sharing this. I want to make sure I understand - what part of this feels most important to address right now?`;
}

function extractKeyPhrase(message: string): string {
  // Look for self-critical statements or key feelings
  const patterns = [
    /i'm (such a|a) (loser|failure|mess|burden|disappointment)/i,
    /i feel (so |really )?(unloved|worthless|hopeless|drowning)/i,
    /i (always|never) (fail|messed up|ruin)/i,
    /(everything|this) feels? pointless/i,
    /i (don't|can't) (do this anymore|handle this)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[0];
  }
  
  // Fallback to first emotionally charged phrase
  const sentences = message.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.length > 10 && sentence.length < 80) {
      return sentence.trim();
    }
  }
  
  return "what you shared";
}

// ============================================================================
// ACTIONABLE PREDICTIONS - What to expect, not what it means
// ============================================================================

function getActionablePrediction(
  emotion: EmotionAnalysis,
  distortion: DistortionAnalysis,
  isSituation: boolean
): string {
  // High intensity
  if (emotion.intensity === 'severe' || emotion.intensity === 'intense') {
    if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') {
      return `They're in a shame spiral. If you try to solve their problem right now, they may feel unheard or even more defective. They need to feel accepted before they can accept help.`;
    }
    
    if (isSituation) {
      return `The distress is coming from relational uncertainty, not lack of coping skills. They're seeking emotional clarity, not advice. Solutions offered too early will likely be rejected or forgotten.`;
    }
    
    return `High emotional activation. They may continue messaging if your response feels too brief or dismissive. Quality of presence matters more than content right now.`;
  }
  
  // Self-criticism
  if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') {
    return `They're being harder on themselves than the situation warrants. If you don't gently challenge the self-judgment, they may leave the conversation feeling worse, not better.`;
  }
  
  // Rumination
  if (distortion.type === 'Rumination') {
    return `They're stuck in a thought loop. Asking "why" questions may deepen the spiral. They need grounding or a single small step, not more analysis.`;
  }
  
  // Relationship situation
  if (isSituation) {
    return `They're responding to real interpersonal ambiguity. Treating this as a "thinking error" may feel invalidating. Focus on their experience, not their interpretation.`;
  }
  
  // Moderate intensity
  if (emotion.intensity === 'moderate') {
    return `Manageable distress. They may be ready for some exploration or gentle reframing, but keep checking if they feel heard first.`;
  }
  
  return `Standard supportive approach. They seem ready for dialogue - follow their lead on depth and pacing.`;
}

// ============================================================================
// PREDICTIVE EMOTIONAL GUIDANCE
// ============================================================================

function getEmotionalGuidance(emotion: EmotionAnalysis): string {
  const guidance: Record<string, Record<string, string>> = {
    exhausted: {
      mild: 'Some fatigue. Brief responses work well.',
      moderate: 'Visibly tired. Keep it warm and concise.',
      intense: 'Significantly drained. Long responses may overwhelm.',
      severe: 'Deeply depleted. Gentle presence only. No tasks or homework.',
    },
    anxious: {
      mild: 'Slight unease. Structure and clarity help.',
      moderate: 'Notable worry. They may seek predictability or reassurance.',
      intense: 'High anxiety. Thoughts likely racing. Ground before exploring.',
      severe: 'Overwhelming anxiety. May struggle to retain what you say. Keep it simple.',
    },
    sad: {
      mild: 'Some melancholy. Acknowledgment goes a long way.',
      moderate: 'Visible sadness. Warmth matters more than insight.',
      intense: 'Deep sorrow. Space for emotion before problem-solving.',
      severe: 'Profound grief. Prioritize emotional safety. No fixing.',
    },
    angry: {
      mild: 'Some frustration. Validate their perspective.',
      moderate: 'Clear anger. They need to feel heard first.',
      intense: 'Strong frustration. May want action or boundaries, not processing.',
      severe: 'Intense anger. Don\'t dismiss the heat. Approach carefully.',
    },
    ashamed: {
      mild: 'Some self-judgment. Normalize their experience.',
      moderate: 'Clear shame. Compassion over correction.',
      intense: 'Deep shame. May feel unworthy of help. Explicit acceptance needed.',
      severe: 'Shame spiral. Non-judgmental presence is everything right now.',
    },
    confused: {
      mild: 'Slight uncertainty. Clarity and structure help.',
      moderate: 'Visible confusion. One step at a time.',
      intense: 'Very lost. Simplify. No complex exploration yet.',
      severe: 'Completely disoriented. Grounding before anything else.',
    },
    disappointed: {
      mild: 'Some letdown. Acknowledge what didn\'t meet expectations.',
      moderate: 'Clear disappointment. Validate the gap between hope and reality.',
      intense: 'Deep disappointment. May need to grieve what didn\'t happen.',
      severe: 'Crushing disappointment. Emotional safety before perspective.',
    },
    inadequate: {
      mild: 'Some self-doubt. Reinforce their worth.',
      moderate: 'Feeling not enough. Challenge the comparison.',
      intense: 'Strong inadequacy. Explicitly affirm their value.',
      severe: 'Profound unworthiness. They need to feel accepted as-is.',
    },
  };
  
  return guidance[emotion.primary]?.[emotion.intensity] || 
    `${emotion.intensity} emotional state. Respond with appropriate warmth and pacing.`;
}

// ============================================================================
// RISK-LEVEL ACTIONS
// ============================================================================

function getRiskAction(level: string, emotion: EmotionAnalysis): { level: 'None' | 'Distress' | 'Panic' | 'Shutdown'; action: string } {
  switch (level) {
    case 'HIGH':
      return {
        level: 'Panic',
        action: 'Crisis indicators detected. Prioritize safety. Consider crisis resources if distress escalates.',
      };
    case 'MEDIUM':
      return {
        level: 'Distress',
        action: 'Elevated distress. Extra validation needed. Check in on their safety if appropriate.',
      };
    default:
      if (emotion.intensity === 'severe') {
        return {
          level: 'Shutdown',
          action: 'High overwhelm detected. Short, gentle responses. No complex cognitive work.',
        };
      }
      return {
        level: 'None',
        action: 'No crisis indicators. Standard supportive approach is appropriate.',
      };
  }
}

// ============================================================================
// SITUATION DETECTION
// ============================================================================

function isLikelySituationMessage(text: string): boolean {
  const situationIndicators = [
    /\bhe\b|\bshe\b|\bthey\b/i,
    /boyfriend|girlfriend|husband|wife|partner/i,
    /friend|people|someone|my (mom|dad|parent|boss|colleague)/i,
    /keeps doing|changed|acting different/i,
    /sometimes|not consistent|mixed signals/i,
    /said to me|told me|yelled at/i,
    /doesn't|won't|always|never/i,
  ];

  for (const pattern of situationIndicators) {
    if (pattern.test(text)) return true;
  }

  return false;
}

function getSituationType(
  emotion: EmotionAnalysis,
  distortion: DistortionAnalysis,
  isSituation: boolean
): string {
  if (isSituation) return 'Interpersonal situation';
  if (distortion.type === 'Rumination') return 'Thought loop';
  if (distortion.type === 'Self-Criticism' || distortion.type === 'Labeling') return 'Self-judgment';
  if (emotion.primary === 'confused') return 'Decision point';
  return 'Emotional distress';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json() as { message: string };
    
    if (!message || message.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Please provide a message to analyze (at least 10 characters).' 
      }, { status: 400 });
    }
    
    // Run analysis
    const emotion = analyzeEmotion(message);
    const distortion = detectDistortions(message);
    const isSituation = isLikelySituationMessage(message);
    const crisisCheck = checkCrisisKeywords(message);
    
    // Generate behavioral guidance
    const behavioralGuidance = getBehavioralGuidance(emotion, distortion, isSituation, crisisCheck.level);
    const replyDraft = generateContextAwareReply(emotion, distortion, isSituation, crisisCheck.level, message);
    const whatToExpect = getActionablePrediction(emotion, distortion, isSituation);
    const emotionalGuidance = getEmotionalGuidance(emotion);
    const riskResult = getRiskAction(crisisCheck.level, emotion);
    
    const analysis: CopilotAnalysis = {
      // BEHAVIORAL GUIDANCE
      responseApproach: behavioralGuidance,
      
      // CONTEXT-AWARE REPLY
      replyDraft,
      
      // ACTIONABLE PREDICTION
      whatToExpect,
      
      // PREDICTIVE GUIDANCE
      emotionalState: {
        intensity: emotion.intensity.charAt(0).toUpperCase() + emotion.intensity.slice(1) as 'Low' | 'Moderate' | 'High' | 'Severe',
        guidance: emotionalGuidance,
      },
      riskLevel: riskResult,
      
      // WHY THE ASSISTANT THINKS THIS
      reasoning: {
        situationType: getSituationType(emotion, distortion, isSituation),
        patterns: distortion.confidence > 0 ? [distortion.type] : [],
        primaryEmotion: emotion.primary,
      },
    };
    
    return NextResponse.json({ analysis });
    
  } catch (error) {
    console.error('Copilot analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed. Please try again.' 
    }, { status: 500 });
  }
}
