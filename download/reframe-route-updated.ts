import { NextRequest, NextResponse } from 'next/server';

// Cognitive distortions database
const DISTORTIONS = [
  {
    name: 'Catastrophizing',
    keywords: ['terrible', 'disaster', 'worst', 'awful', 'horrible', 'end of the world', 'ruin', 'destroy'],
    explanation: 'Your mind is jumping to the worst possible outcome without evidence.',
  },
  {
    name: 'All-or-Nothing Thinking',
    keywords: ['always', 'never', 'every', 'complete', 'total', 'absolute', 'failure', 'perfect'],
    explanation: 'You\'re seeing things in black and white, with no middle ground.',
  },
  {
    name: 'Mind Reading',
    keywords: ['they think', 'everyone thinks', 'people think', 'he thinks', 'she thinks', 'they must think'],
    explanation: 'You\'re assuming you know what others are thinking without evidence.',
  },
  {
    name: 'Fortune Telling',
    keywords: ['will fail', 'going to fail', "won't work", 'never happen', 'always fail', 'doomed'],
    explanation: 'You\'re predicting negative outcomes as if you can see the future.',
  },
  {
    name: 'Emotional Reasoning',
    keywords: ['i feel', 'feels like', 'so hard', 'overwhelming', 'impossible', 'can\'t handle'],
    explanation: 'You\'re treating your feelings as facts rather than temporary states.',
  },
  {
    name: 'Should Statements',
    keywords: ['should', 'must', 'have to', 'ought to', 'supposed to'],
    explanation: 'You\'re holding yourself to rigid, unrealistic standards.',
  },
  {
    name: 'Labeling',
    keywords: ['i am a', 'i\'m a', 'i\'m such', 'stupid', 'loser', 'failure', 'worthless'],
    explanation: 'You\'re applying a negative label to yourself instead of describing the behavior.',
  },
  {
    name: 'Personalization',
    keywords: ['my fault', 'because of me', 'i caused', 'responsible for', 'blame myself'],
    explanation: 'You\'re taking too much responsibility for things outside your control.',
  },
  {
    name: 'Mental Filter',
    keywords: ['only', 'just focus', 'can\'t see', 'ignoring', 'overlooking the good'],
    explanation: 'You\'re focusing exclusively on the negative while filtering out positives.',
  },
  {
    name: 'Discounting Positives',
    keywords: ["doesn't count", 'not a big deal', 'anyone could', 'just luck', 'not really'],
    explanation: 'You\'re dismissing your accomplishments and positive experiences.',
  },
];

// Empathetic responses based on emotion detection
const EMPATHY_RESPONSES = {
  exhausted: [
    "I can really feel how drained you are. That exhaustion is valid and real.",
    "It sounds like you've been carrying a heavy load. Let's explore this together.",
    "Exhaustion often signals that something important needs attention. I'm here to help.",
  ],
  anxious: [
    "I can sense the anxiety in your words. That feeling of unease is difficult to sit with.",
    "Anxiety has a way of making everything feel urgent. Let's slow down together.",
    "The worry in your message is palpable. You're not alone in feeling this way.",
  ],
  sad: [
    "I hear the sadness in what you're sharing. It's okay to feel this way.",
    "That heaviness you're describing is real, and it matters.",
    "Sadness often carries important messages. Let's listen to it together.",
  ],
  angry: [
    "I can feel the frustration in your words. That energy wants to be acknowledged.",
    "Anger often points to something that matters deeply to you.",
    "The intensity you're feeling is valid. Let's explore what's underneath it.",
  ],
  stuck: [
    "That feeling of being stuck can be so frustrating. You're looking for a way forward.",
    "Sometimes feeling stuck is a sign we need a new perspective.",
    "I hear you feeling trapped. Let's find some movement together.",
  ],
  default: [
    "Thank you for sharing that with me. Your feelings matter.",
    "I hear what you're saying, and I'm here to help you work through it.",
    "It takes courage to examine our thoughts. Let's explore this together.",
  ],
};

// Encouragement messages
const ENCOURAGEMENTS = [
  "You're showing real self-awareness by examining this thought.",
  "The fact that you're here, working on this, shows incredible strength.",
  "Every step of self-reflection is a step toward growth.",
  "You have the capacity to see things differently.",
  "This exploration is valuable work.",
  "Your willingness to question your thoughts is inspiring.",
  "Remember: thoughts are just thoughts, not facts.",
  "You're building resilience with each reflection.",
];

// Probing questions based on iceberg layer
const PROBING_QUESTIONS = {
  surface: [
    "What specifically triggered this thought?",
    "When did you first notice this feeling?",
    "What were you doing when this thought came up?",
  ],
  trigger: [
    "What does this situation mean to you?",
    "Why do you think this particular trigger affects you so deeply?",
    "What's the story you're telling yourself about this?",
  ],
  emotion: [
    "If this emotion had a message for you, what would it say?",
    "What need might be underneath this feeling?",
    "How long have you been carrying this emotion?",
  ],
  coreBelief: [
    "If this belief were true, what would that mean about you?",
    "Where might this belief have come from?",
    "What would happen if you chose not to believe this anymore?",
  ],
};

function detectDistortion(message: string): { name: string; explanation: string } {
  const lowerMessage = message.toLowerCase();
  
  for (const distortion of DISTORTIONS) {
    for (const keyword of distortion.keywords) {
      if (lowerMessage.includes(keyword)) {
        return distortion;
      }
    }
  }
  
  return {
    name: 'Negative Thought Pattern',
    explanation: 'Our minds sometimes create patterns that don\'t serve our wellbeing.',
  };
}

function detectEmotion(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (/exhaust|tired|drained|worn out|weary|fatigue/.test(lowerMessage)) return 'exhausted';
  if (/anxious|worried|nervous|panic|scared|fear|afraid/.test(lowerMessage)) return 'anxious';
  if (/sad|depressed|hopeless|down|empty|lonely/.test(lowerMessage)) return 'sad';
  if (/angry|frustrated|annoyed|mad|irritated/.test(lowerMessage)) return 'angry';
  if (/stuck|trapped|can't|impossible|no way/.test(lowerMessage)) return 'stuck';
  
  return 'default';
}

function generateReframe(message: string, distortionName: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Specific reframes for common patterns
  const reframes: Record<string, string[]> = {
    exhausted: [
      "Instead of 'I am exhausted,' try: 'I am experiencing exhaustion right now, which is my body signaling that I need rest and care. This feeling is temporary and valid.'",
      "Reframe: 'I have been giving a lot of energy to things that matter. This exhaustion is evidence of my effort, not my weakness.'",
      "Try thinking: 'I am learning to listen to my body's signals. Rest is productive, and taking care of myself is not selfish.'",
    ],
    anxious: [
      "Instead of 'I'm so anxious,' try: 'I am experiencing anxiety, which is my body's way of preparing me for a challenge. I can acknowledge this feeling without being consumed by it.'",
      "Reframe: 'My mind is trying to protect me by anticipating challenges. I can thank it for trying to help while choosing a more balanced perspective.'",
      "Try thinking: 'This feeling of anxiety is temporary. I have handled difficult situations before, and I can handle this one too.'",
    ],
    sad: [
      "Instead of focusing on the sadness, try: 'I am feeling sad right now, and that's a normal human emotion. This feeling will pass, and it doesn't define who I am.'",
      "Reframe: 'My sadness shows that I care deeply about something. I can honor this feeling while also taking small steps toward feeling better.'",
      "Try thinking: 'This emotion is evidence of my capacity to feel deeply. I am resilient, and I have gotten through difficult times before.'",
    ],
    stuck: [
      "Instead of 'I'm stuck,' try: 'I am in a transition period. Feeling stuck often comes before a breakthrough.'",
      "Reframe: 'I haven't found the right path yet, but that doesn't mean there isn't one. I can take small steps even when I can't see the whole staircase.'",
      "Try thinking: 'What feels like being stuck might actually be a pause for growth. I am exactly where I need to be right now.'",
    ],
    always: [
      `Instead of using 'always,' try: 'This has happened several times, but that doesn't mean it will continue forever. Each moment is a new opportunity.'`,
      "Reframe: 'I'm noticing a pattern, but patterns can be changed. I have the power to create new experiences.'",
    ],
    never: [
      `Instead of using 'never,' try: 'This hasn't happened yet, but the future is full of possibilities I can't predict.'`,
      "Reframe: 'I haven't experienced this success yet, but that's different from it being impossible. Progress often happens gradually.'",
    ],
    failure: [
      "Instead of 'I'm a failure,' try: 'I experienced a setback. This doesn't define me-it's simply something that happened, not who I am.'",
      "Reframe: 'Failure is not the opposite of success; it's part of the path to success. Every successful person has a collection of failures.'",
    ],
    should: [
      "Instead of 'I should,' try: 'I could choose to do this, or I could choose differently. What feels most aligned with my values?'",
      "Reframe: 'Let me reframe this 'should' as a want or choice. What would happen if I approached this with curiosity instead of judgment?'",
    ],
  };
  
  // Check for specific keywords
  for (const [key, options] of Object.entries(reframes)) {
    if (lowerMessage.includes(key)) {
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  
  // Default reframe
  const defaultReframes = [
    `This thought is just that-a thought. It's not a fact or a prediction. I can observe it without accepting it as truth.`,
    `What if this thought is trying to protect me in some way? I can acknowledge its intention while choosing a more helpful perspective.`,
    `Instead of accepting this thought at face value, I can get curious: What would I tell a friend who had this thought?`,
    `This thought feels real, but feelings aren't facts. I have the power to examine it and choose a different narrative.`,
  ];
  
  return defaultReframes[Math.floor(Math.random() * defaultReframes.length)];
}

function determineLayer(conversationLength: number): 'surface' | 'trigger' | 'emotion' | 'coreBelief' {
  if (conversationLength < 2) return 'surface';
  if (conversationLength < 4) return 'trigger';
  if (conversationLength < 6) return 'emotion';
  return 'coreBelief';
}

function generateLayerInsight(layer: string, message: string): string {
  const insights = {
    surface: [
      "This is the initial thought that caught your attention-the tip of the iceberg.",
      "We're starting with what's most visible. There may be more to explore underneath.",
      "Surface thoughts often point to deeper patterns. Let's see what we discover.",
    ],
    trigger: [
      "We're starting to see what might activate this thought pattern.",
      "Understanding your triggers is the first step to responding differently.",
      "What sets off this thought may reveal something important about your values.",
    ],
    emotion: [
      "There's a deeper emotion beneath this thought that deserves attention.",
      "Your feelings carry wisdom. This emotion might have an important message.",
      "The emotion driving this thought is valid and worth exploring.",
    ],
    coreBelief: [
      "We've reached a core belief-a fundamental assumption you may hold about yourself or the world.",
      "This deeper belief may have been with you for a long time. Awareness is the first step to change.",
      "Core beliefs often form early and operate unconsciously. Bringing this to light is powerful work.",
    ],
  };
  
  const options = insights[layer as keyof typeof insights];
  return options[Math.floor(Math.random() * options.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, conversationHistory = [] } = body as {
      userMessage: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    console.log('Reframe API called with:', { userMessage, historyLength: conversationHistory.length });

    if (!userMessage) {
      console.log('Error: No userMessage provided');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Detect the cognitive distortion
    const distortion = detectDistortion(userMessage);
    console.log('Detected distortion:', distortion.name);
    
    // Detect the primary emotion
    const emotion = detectEmotion(userMessage);
    console.log('Detected emotion:', emotion);
    
    // Get empathy response
    const empathyOptions = EMPATHY_RESPONSES[emotion as keyof typeof EMPATHY_RESPONSES];
    const acknowledgment = empathyOptions[Math.floor(Math.random() * empathyOptions.length)];
    
    // Generate reframe
    const reframe = generateReframe(userMessage, distortion.name);
    
    // Determine iceberg layer
    const layer = determineLayer(conversationHistory.length);
    
    // Get probing question
    const questions = PROBING_QUESTIONS[layer];
    const probingQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Get encouragement
    const encouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    
    // Generate layer insight
    const layerInsight = generateLayerInsight(layer, userMessage);

    const response = {
      acknowledgment,
      distortionType: distortion.name,
      distortionExplanation: distortion.explanation,
      reframe,
      probingQuestion,
      encouragement,
      icebergLayer: layer,
      layerInsight,
    };

    console.log('Sending response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Reframe API error:', error);
    return NextResponse.json(
      { error: 'Failed to process your thought. Please try again.' },
      { status: 500 }
    );
  }
}
