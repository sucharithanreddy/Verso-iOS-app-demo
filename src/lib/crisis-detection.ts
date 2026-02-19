// ============================================================================
// CRISIS DETECTION & SAFETY RESOURCES
// Ethical requirement for mental health applications
// ============================================================================

// Crisis keywords that indicate potential self-harm or emergency
const CRISIS_KEYWORDS = [
  // Direct self-harm indicators
  'kill myself', 'suicide', 'suicidal', 'want to die', 'ending it all',
  'end my life', 'take my life', 'no reason to live', 'better off dead',
  'hurt myself', 'self-harm', 'cutting myself', 'overdose',
  
  // Severe distress indicators
  'can\'t go on', 'give up', 'no hope', 'no point in living',
  'everyone would be better off without me', 'planning to',
  
  // Emergency indicators
  'emergency', 'help me now', 'i\'m in danger', 'being hurt'
];

export const SEVERITY_LEVELS = {
  HIGH: 'high',      // Direct self-harm language - immediate resources
  MODERATE: 'moderate', // Severe distress - show resources gently
  LOW: 'low'         // General negative thoughts - normal CBT flow
} as const;

interface CrisisCheckResult {
  level: typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];
  keywords: string[];
  needsResources: boolean;
}

/**
 * Check text for crisis indicators
 * Returns severity level and detected keywords
 */
export function checkCrisisKeywords(text: string): CrisisCheckResult {
  const lowerText = text.toLowerCase();
  const detectedKeywords: string[] = [];
  
  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }
  
  // Determine severity based on keywords found
  if (detectedKeywords.length === 0) {
    return { level: SEVERITY_LEVELS.LOW, keywords: [], needsResources: false };
  }
  
  // High-severity keywords
  const highSeverityKeywords = ['suicide', 'suicidal', 'kill myself', 'want to die', 
    'ending it all', 'end my life', 'overdose', 'self-harm'];
  
  const hasHighSeverity = detectedKeywords.some(k => 
    highSeverityKeywords.some(hk => k.includes(hk))
  );
  
  if (hasHighSeverity || detectedKeywords.length >= 2) {
    return { level: SEVERITY_LEVELS.HIGH, keywords: detectedKeywords, needsResources: true };
  }
  
  return { level: SEVERITY_LEVELS.MODERATE, keywords: detectedKeywords, needsResources: true };
}

/**
 * Crisis resources organized by region
 */
export const CRISIS_RESOURCES = {
  // India-specific (primary market for Wysa, etc.)
  india: [
    { name: 'AASRA', phone: '+91-22-27546669', description: '24x7 helpline for emotional support', url: 'https://aasra.info' },
    { name: 'Vandrevala Foundation', phone: '+91-22-25706000', description: 'Mental health helpline', url: 'https://vandrevalafoundation.com' },
    { name: 'iCall (TATA Institute)', phone: '+91-22-25521111', description: 'Mon-Sat, 8am-10pm', url: 'https://icallhelpline.org' },
  ],
  
  // Global/US
  global: [
    { name: 'International Association for Suicide Prevention', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
    { name: 'Samaritans (UK)', phone: '116 123', description: 'Free, 24/7', url: 'https://www.samaritans.org' },
    { name: '988 Suicide & Crisis Lifeline (US)', phone: '988', description: 'Call or text, 24/7', url: 'https://988lifeline.org' },
  ],
  
  // Emergency
  emergency: {
    instruction: 'If you are in immediate danger, please call your local emergency services:',
    numbers: [
      { country: 'US/Canada', number: '911' },
      { country: 'UK', number: '999' },
      { country: 'India', number: '112' },
      { country: 'Australia', number: '000' },
    ]
  }
};

/**
 * Generate crisis response message based on severity
 */
export function generateCrisisResponse(level: typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS]): string {
  if (level === SEVERITY_LEVELS.HIGH) {
    return `I'm really glad you're here and sharing this with me. What you're feeling right now matters, and I want to make sure you have the support you need.

**Please reach out to someone who can help right now:**

🆘 **If you're in immediate danger, call emergency services:**
- US/Canada: 911
- UK: 999  
- India: 112

📞 **Crisis Helplines (24/7, free, confidential):**
- **988 Suicide & Crisis Lifeline** (US): Call or text **988**
- **Samaritans** (UK): **116 123**
- **AASRA** (India): **+91-22-27546669**
- **Vandrevala Foundation** (India): **+91-22-25706000**

You don't have to carry this alone. These people are trained to help, and they want to hear from you.

I'm here to continue exploring what you're going through whenever you're ready, but please prioritize connecting with a human who can support you right now. 💙`;
  }
  
  // Moderate severity
  return `What you're sharing sounds really heavy, and I want you to know that it's okay to reach out for more support. Sometimes talking to a trained listener can help in ways that go beyond what I can offer.

**Here are some resources if you need them:**

📞 **Crisis Helplines:**
- **988 Lifeline** (US): Call or text **988**
- **Samaritans** (UK): **116 123**
- **AASRA** (India): **+91-22-27546669**

These are free, confidential, and available 24/7. You don't have to be in crisis to call - they're there to listen.

Now, let's continue exploring what's on your mind...`;
}

/**
 * Disclaimer text for mental health app
 */
export const MENTAL_HEALTH_DISCLAIMER = `This app is a supportive tool for exploring thoughts and emotions, but it is not a replacement for professional mental health care. If you're experiencing a mental health crisis or have thoughts of harming yourself, please contact a crisis helpline or emergency services immediately.`;

/**
 * Get appropriate disclaimer for API responses
 */
export function getAppropriateDisclaimer(isCrisis: boolean): string {
  if (isCrisis) {
    return `⚠️ Important: I'm an AI, not a mental health professional. If you're in crisis, please reach out to a human who can help. The resources above are available 24/7.`;
  }
  return `💡 Remember: I'm an AI support tool, not a therapist. This is a space for reflection, but professional help is always available if you need it.`;
}
