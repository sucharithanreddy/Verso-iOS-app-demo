// ============================================================================
// AI SERVICE - Multi-Provider with Fallback Chain (NO Z.AI SDK)
// 
// Default: Mistral (if configured), fallback: Anthropic (if configured)
// Optional: other providers supported via env vars or per-call config
//
// Supported Providers: Mistral, Anthropic, OpenAI, Groq, Together, OpenRouter, Gemini, DeepSeek
// ============================================================================

// Types
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export type AIProvider =
  | 'mistral'
  | 'anthropic'
  | 'openai'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'gemini'
  | 'deepseek';

export interface AIServiceConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// ============================================================================
// PROVIDERS (Direct API Calls)
// ============================================================================

async function callOpenAI(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'gpt-4o';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'openai',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callAnthropic(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'claude-sonnet-4-20250514';

  const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      // ✅ remove this in production unless you specifically need it
      // 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemMessage,
      messages: conversationMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    provider: 'anthropic',
    model,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callGroq(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'llama-3.3-70b-versatile';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'groq',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callTogether(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Together AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'together',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callOpenRouter(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'anthropic/claude-3.5-sonnet';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Verso',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'openrouter',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callGemini(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'gemini-2.0-flash';

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === 'system')?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    provider: 'gemini',
    model,
  };
}

async function callMistral(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'mistral-small-latest';

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'mistral',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callDeepSeek(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'deepseek-chat';

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'deepseek',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

// ============================================================================
// MAIN AI SERVICE - Fallback chain (Mistral -> Anthropic -> others)
// ============================================================================

export async function callAI(messages: AIMessage[], config?: AIServiceConfig): Promise<AIResponse | null> {
  console.log('=== AI Provider Selection (NO Z SDK) ===');

  // 1) Explicit provider via config (if provided)
  if (config?.provider && config?.apiKey) {
    const providerConfig: AIProviderConfig = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    };

    try {
      switch (config.provider) {
        case 'mistral':
          return await callMistral(messages, providerConfig);
        case 'anthropic':
          return await callAnthropic(messages, providerConfig);
        case 'openai':
          return await callOpenAI(messages, providerConfig);
        case 'groq':
          return await callGroq(messages, providerConfig);
        case 'together':
          return await callTogether(messages, providerConfig);
        case 'openrouter':
          return await callOpenRouter(messages, providerConfig);
        case 'gemini':
          return await callGemini(messages, providerConfig);
        case 'deepseek':
          return await callDeepSeek(messages, providerConfig);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      console.error(`Configured provider ${config.provider} failed:`, error);
      // fall through
    }
  }

  // 2) Env-based fallback chain
  // Priority: Mistral -> Anthropic -> OpenAI -> Groq -> Together -> OpenRouter -> Gemini -> DeepSeek
  console.log('Checking configured providers...');
  console.log('Mistral:', !!process.env.MISTRAL_API_KEY);
  console.log('Anthropic:', !!process.env.ANTHROPIC_API_KEY);
  console.log('OpenAI:', !!process.env.OPENAI_API_KEY);

  if (process.env.MISTRAL_API_KEY) {
    try {
      return await callMistral(messages, {
        apiKey: process.env.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      });
    } catch (e) {
      console.error('❌ Mistral failed, trying next:', e);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(messages, {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      });
    } catch (e) {
      console.error('❌ Anthropic failed, trying next:', e);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(messages, {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      });
    } catch (e) {
      console.error('❌ OpenAI failed, trying next:', e);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(messages, {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      });
    } catch (e) {
      console.error('❌ Groq failed, trying next:', e);
    }
  }

  if (process.env.TOGETHER_API_KEY) {
    try {
      return await callTogether(messages, {
        apiKey: process.env.TOGETHER_API_KEY,
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      });
    } catch (e) {
      console.error('❌ Together failed, trying next:', e);
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(messages, {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      });
    } catch (e) {
      console.error('❌ OpenRouter failed, trying next:', e);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(messages, {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      });
    } catch (e) {
      console.error('❌ Gemini failed, trying next:', e);
    }
  }

  if (process.env.DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(messages, {
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      });
    } catch (e) {
      console.error('❌ DeepSeek failed:', e);
    }
  }

  console.error('❌ No AI provider configured or all providers failed.');
  return null;
}

// ============================================================================
// Helpers
// ============================================================================

export function hasAIProvider(): boolean {
  return Boolean(
    process.env.MISTRAL_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.TOGETHER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.DEEPSEEK_API_KEY
  );
}

export function getConfiguredProvider(): string {
  if (process.env.MISTRAL_API_KEY) return 'Mistral AI';
  if (process.env.ANTHROPIC_API_KEY) return 'Anthropic Claude';
  if (process.env.OPENAI_API_KEY) return 'OpenAI GPT';
  if (process.env.GROQ_API_KEY) return 'Groq (LLaMA)';
  if (process.env.TOGETHER_API_KEY) return 'Together AI';
  if (process.env.OPENROUTER_API_KEY) return 'OpenRouter';
  if (process.env.GEMINI_API_KEY) return 'Google Gemini';
  if (process.env.DEEPSEEK_API_KEY) return 'DeepSeek';
  return 'No provider configured';
}

export function getSupportedProviders(): Array<{
  name: string;
  envKey: string;
  defaultModel: string;
  tier: string;
  website: string;
}> {
  return [
    {
      name: 'Mistral AI',
      envKey: 'MISTRAL_API_KEY',
      defaultModel: 'mistral-small-latest',
      tier: 'Recommended',
      website: 'https://console.mistral.ai',
    },
    {
      name: 'Anthropic Claude',
      envKey: 'ANTHROPIC_API_KEY',
      defaultModel: 'claude-sonnet-4-20250514',
      tier: 'Premium',
      website: 'https://console.anthropic.com',
    },
    {
      name: 'OpenAI GPT',
      envKey: 'OPENAI_API_KEY',
      defaultModel: 'gpt-4o',
      tier: 'Premium',
      website: 'https://platform.openai.com',
    },
    {
      name: 'Groq (LLaMA)',
      envKey: 'GROQ_API_KEY',
      defaultModel: 'llama-3.3-70b-versatile',
      tier: 'Fast',
      website: 'https://console.groq.com',
    },
    {
      name: 'Together AI',
      envKey: 'TOGETHER_API_KEY',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      tier: 'Pay-per-use',
      website: 'https://api.together.xyz',
    },
    {
      name: 'OpenRouter',
      envKey: 'OPENROUTER_API_KEY',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      tier: 'Model router',
      website: 'https://openrouter.ai',
    },
    {
      name: 'Google Gemini',
      envKey: 'GEMINI_API_KEY',
      defaultModel: 'gemini-2.0-flash',
      tier: 'Pay-per-use',
      website: 'https://aistudio.google.com',
    },
    {
      name: 'DeepSeek',
      envKey: 'DEEPSEEK_API_KEY',
      defaultModel: 'deepseek-chat',
      tier: 'Pay-per-use',
      website: 'https://platform.deepseek.com',
    },
  ];
}
