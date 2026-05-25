// Utility to call the Gemini model hosted on openrouter.ai
import * as SecureStore from 'expo-secure-store';
import {
  ApiRequestError,
  cachedRequestJson,
  fetchWithTimeout,
  requestJson,
} from './apiHelper';
import { getConfigValue, getBackendUrl } from './config';

// Get config values via centralized helper (works in Expo Go AND standalone APKs)
const ENV = {
  OPENROUTER_API_KEY: getConfigValue('OPENROUTER_API_KEY'),
  OPENROUTER_BASE_URL: '', // not used, hardcoded below
};

// Get backend API URL from centralized config
const getBackendApiUrl = (): string => {
  return getBackendUrl();
};

export type ChatbotCoachContext = {
  goalLabel?: string;
  plan?: "free" | "premium";
  score?: number;
  scoreLabel?: string;
  scoreConfidence?: string;
  streakCount?: number;
  recentLogs?: string[];
  calories?: {
    achieved: number;
    target: number;
    progress: number;
  };
  hydration?: {
    achieved: number;
    target: number;
    progress: number;
  };
  steps?: {
    achieved: number;
    target: number;
    progress: number;
    source: "pedometer" | "local history" | "manual log";
  };
  nextBestAction?: string;
};

const buildCoachContextPrompt = (context?: ChatbotCoachContext) => {
  if (!context) {
    return [
      "HeaLora response rules:",
      "Use concise, practical coaching.",
      "Give today's next best action when the user asks for guidance.",
      "Avoid generic health advice and avoid long lists.",
      "Use a gentle medical disclaimer only for symptoms, medications, diagnoses, injuries, or urgent concerns.",
    ].join("\n");
  }

  const contextLines = [
    `Goal: ${context.goalLabel || "unknown"}`,
    `Plan: ${context.plan || "free"}`,
    `Score: ${context.score ?? "unknown"} (${context.scoreLabel || "health score"}, ${context.scoreConfidence || "signal unknown"})`,
    `Streak: ${context.streakCount ?? 0} day(s)`,
    context.calories
      ? `Calories: ${context.calories.achieved}/${context.calories.target} (${context.calories.progress}%) from manual logs`
      : "Calories: not logged",
    context.hydration
      ? `Hydration: ${context.hydration.achieved}/${context.hydration.target}L (${context.hydration.progress}%) from manual logs`
      : "Hydration: not logged",
    context.steps
      ? `Steps: ${context.steps.achieved}/${context.steps.target} (${context.steps.progress}%) from ${context.steps.source}`
      : "Steps: not available",
    context.nextBestAction ? `Today's next best action: ${context.nextBestAction}` : null,
    context.recentLogs?.length ? `Recent logs: ${context.recentLogs.join("; ")}` : null,
  ].filter(Boolean);

  return [
    "HeaLora response rules:",
    "Use the FitFaat context below when it helps.",
    "Keep replies short: 2 to 4 sentences or 3 bullets maximum.",
    "Make suggestions specific, immediate, and doable today.",
    "Avoid generic health advice. Do not invent data that is not in context.",
    "Give today's next best action when relevant.",
    "Use a gentle medical disclaimer only for symptoms, medications, diagnoses, injuries, or urgent concerns.",
    "",
    "FitFaat context:",
    ...contextLines,
  ].join("\n");
};

const buildDirectChatbotResponse = async (
  message: string,
  coachContext?: ChatbotCoachContext
) => {
  const userTimestamp = new Date().toISOString();
  const content = await callGemini(message, {
    contextPrompt: buildCoachContextPrompt(coachContext),
    temperature: 0.45,
  });

  return {
    userMessage: {
      role: 'user' as const,
      content: message,
      source: 'local_ai',
      timestamp: userTimestamp,
    },
    aiResponse: {
      role: 'assistant' as const,
      content,
      source: 'gemini_ai' as const,
      timestamp: new Date().toISOString(),
    },
  };
};

// Helper function to check if query is a greeting or thanks/help
function isGreetingQuery(query: string): boolean {
  const greetings = [
   'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'good night', 'good day', 'how are you', 'how are you doing',
    'how’s it going', 'how have you been', 'how do you do',
    'nice to meet you', 'pleased to meet you', 'good to see you',
    'great to see you', 'long time no see', 'it’s been a while',
    'what’s up', 'whatsup', 'wassup', 'sup', 'yo', 'hey there',
    'hi there', 'hello there', 'hiya', 'howdy', 'morning', 'afternoon', 'evening',
    'welcome', 'warm welcome', 'you’re welcome', 'good to talk to you',
    'great talking to you', 'happy to see you', 'happy morning',
    'hope you’re doing well', 'hope you’re fine', 'hope you’re great',
    'hope you’re okay', 'nice day', 'have a nice day', 'have a good day',
    'have a great day', 'have a wonderful day', 'good vibes', 'cheers',
    'yo buddy', 'hi friend', 'hey buddy', 'hey friend', 'hello friend',
    'hey mate', 'hi mate', 'hiya pal', 'hey pal', 'hey bro', 'hey sis',
    'hey man', 'hey there!', 'hello again', 'welcome back', 'it’s nice to see you again',
    'can you help', 'can u help', 'can you assist', 'can you assist me',
    'could you help', 'help', 'help me', 'assist me', 'i need help', 'need help',
    'please help', 'please assist', 'please', 'thanks', 'thank you', 'thankyou',
    'thank you so much', 'many thanks', 'thanks a lot', 'thanks so much',
    'much appreciated', 'really appreciate', 'appreciate it', 'so grateful',
    'grateful', 'so kind of you', 'that’s kind', 'you’re kind', 'bless you',
    'god bless', 'take care', 'see you', 'see you soon', 'see you later',
    'talk soon', 'catch you later', 'bye', 'goodbye', 'bye bye', 'later', 'ciao',
    'cheerio', 'farewell', 'until next time', 'shalom', 'namaste', 'bonjour',
    'hola', 'ciao', 'salut', 'hallo', 'ola', 'aloha', 'konnichiwa', 'ni hao',
    'marhaba', 'guten tag', 'buongiorno', 'hola amigo', 'bonjour mon ami',
    'salaam', 'as-salamu alaykum', 'hi everyone', 'hey everyone', 'hello everyone',
    'hi all', 'hey all', 'hi guys', 'hey guys', 'good to hear from you',
    'happy to connect', 'nice to connect', 'pleasure meeting you', 'pleasure to chat',
    'how can you help', 'what can you do', 'introduce yourself', 'who are you',
    'are you there', 'is anyone there', 'anyone here', 'yo there', 'good chatting with you',
  ];
  const lower = query.toLowerCase();
  return greetings.some(g => lower.includes(g));
}

function isHealthQuery(query: string): boolean {
  // List of health-related keywords
  const healthKeywords = [
    // Vital Signs and Body Functions
    'blood pressure', 'heartbeat', 'temperature', 'oxygen', 'breathing', 'digestion',
    'metabolism', 'pulse', 'heart rate', 'body temperature',
    // Symptoms and Conditions
    'stomachache', 'headache', 'backache', 'toothache', 'pain', 'fever', 'cold', 'flu',
    'cough', 'allergy', 'diabetes', 'tired', 'weak', 'strong',
    // Body Parts and Systems
    'heart', 'brain', 'lungs', 'kidney', 'liver', 'blood', 'muscle', 'bone', 'joint',
    'skin', 'body', 'posture', 'stomach', 'teeth',
    // Healthcare and Medical
    'doctor', 'nurse', 'patient', 'checkup', 'medicine', 'diagnosis', 'treatment',
    'prevention', 'healing', 'healthcare', 'home remedy', 'medical',
    // Nutrition and Diet
    'diet', 'nutrition', 'meal', 'food', 'healthy food', 'junk food', 'home-cooked',
    'breakfast', 'lunch', 'dinner', 'snack', 'portion', 'calorie', 'diet chart',
    'meal time', 'breakfast time', 'meal plan', 'grocery',
    // Foods and Beverages
    'fruits', 'vegetables', 'grains', 'nuts mix', 'herbal tea', 'warm soup',
    'fruit juice', 'smoothie', 'cold water', 'warm water', 'breakfast bowl',
    'salad bowl',
    // Kitchen and Cooking
    'kitchen', 'cooking', 'boiling', 'baking', 'frying', 'spoon', 'plate', 'bowl',
    'glass', 'water bottle',
    // Taste and Flavors
    'taste', 'spicy', 'sweet', 'salty', 'sour', 'bitter',
    // Exercise and Fitness
    'exercise', 'fitness', 'workout', 'morning walk', 'gym', 'trainer', 'coach',
    'stretch', 'move', 'climb', 'walk', 'yoga', 'physical activity', 'gym bag',
    // Rest and Sleep
    'sleep', 'deep sleep', 'rest', 'nap', 'rest day', 'rest time', 'recovery',
    'early rise',
    // Daily Routine and Timing
    'morning', 'evening', 'night', 'daily', 'weekly', 'routine', 'plan',
    // Hygiene and Self-care
    'hygiene', 'self-care', 'clean room', 'shower', 'towel', 'toothbrush',
    'toothpaste', 'shampoo', 'soap', 'comb', 'mirror', 'handwash', 'face wash',
    // Mental Health and Wellness
    'mental health', 'healthy mind', 'good mood', 'laughter', 'peace of mind',
    'stress', 'anxiety', 'depression', 'meditation', 'mindful', 'happiness',
    'mental', 'calm', 'mood',
    // Environment and Lifestyle
    'fresh air', 'sunshine', 'sunlight', 'outdoor', 'indoor', 'weather',
    'lifestyle', 'fresh start',
    // Social Health
    'family', 'friends', 'walk', 'talk',
    // Motivation and Goals
    'focus', 'determination', 'motivation', 'discipline', 'goal', 'progress',
    // General Health Terms
    'health', 'healthy', 'wellness', 'balance', 'energy', 'immunity', 'vitality',
    'strength', 'endurance', 'safety'
  ];
  // ...existing code for matching...
  const lowerQuery = query.toLowerCase();
  return healthKeywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API call with retries. Honors Retry-After header when provided.
async function makeAPICall(
  url: string,
  options: RequestInit,
  retries = 5,
  baseDelay = 1000,
  timeoutMs = 18000
): Promise<Response> {
  let lastError: unknown = null;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (response.status === 429) {
        // Prefer server-supplied Retry-After header
        const ra = response.headers.get('Retry-After') || response.headers.get('retry-after');
        let waitTimeMs: number;
        if (ra) {
          // Retry-After can be seconds or an HTTP-date
          const seconds = Number(ra);
          if (!Number.isNaN(seconds)) {
            waitTimeMs = Math.max(0, seconds) * 1000;
          } else {
            const time = Date.parse(ra);
            if (!Number.isNaN(time)) {
              waitTimeMs = Math.max(0, time - Date.now());
            } else {
              waitTimeMs = baseDelay * Math.pow(2, i);
            }
          }
        } else {
          // Fallback to exponential backoff
          waitTimeMs = baseDelay * Math.pow(2, i);
        }
        console.log(`Rate limited. Waiting ${waitTimeMs}ms before retry ${i + 1}/${retries}`);
        await delay(waitTimeMs);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (i === retries - 1) throw err;
      const waitTime = baseDelay * Math.pow(2, i);
      await delay(waitTime);
    }
  }
  // Provide more context when giving up
  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Max retries reached${errMsg ? `: ${errMsg}` : ''}`);
}

export async function callGemini(
  prompt: string,
  options?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    baseUrl?: string;
    retries?: number;
    baseDelay?: number;
    timeoutMs?: number;
    contextPrompt?: string;
    systemPrompt?: string;
  }
): Promise<string> {
  if (isGreetingQuery(prompt)) {
    // For greetings, let the AI generate a dynamic, friendly response
    const API_KEY = options?.apiKey || ENV?.OPENROUTER_API_KEY;
    if (!API_KEY) {
      throw new Error(
        'OPENROUTER_API_KEY is not set. Provide it via .env file or pass apiKey in options.'
      );
    }
    const model = options?.model || 'deepseek/deepseek-r1-0528:free';
    // Allow configuring the base API URL (useful if you want to use another proxy/provider)
    const BASE_API_URL = options?.baseUrl || ENV?.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const messages = [
      {
        role: 'system',
        content: options?.systemPrompt || "You are HeaLora, an AI-powered health companion. Respond warmly, keep answers concise, and use FitFaat context when available."
      },
      ...(options?.contextPrompt ? [{ role: 'system', content: options.contextPrompt }] : []),
      { role: 'user', content: prompt }
    ];
    const body = {
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
    } as const;
    const res = await makeAPICall(`${BASE_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://your-app-domain.com',
        'X-Title': 'Bot App',
      },
      body: JSON.stringify(body),
    }, options?.retries ?? 5, options?.baseDelay ?? 1000, options?.timeoutMs ?? 18000);
    if (!res.ok) {
      // Try to parse JSON error to detect common OpenRouter 404 policy issue
      const text = await res.text();
      let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
      const errMsg = parsed?.error?.message || text || `Status ${res.status}`;
      if (res.status === 404 && /No endpoints found/i.test(errMsg)) {
        throw new Error(
          `Provider returned 404 for model '${model}': ${errMsg}. This often means the provider (OpenRouter) does not expose this model under your account or privacy settings. You can: (1) choose a different model supported by OpenRouter, (2) check your OpenRouter privacy/settings at https://openrouter.ai/settings/privacy, or (3) set a different base API URL via ENV.OPENROUTER_BASE_URL or pass options.baseUrl to point at a provider that supports this model.`
        );
      }
      throw new Error(`OpenRouter request failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const choice = data?.choices?.[0] ?? null;
    if (choice?.message?.content) {
      if (typeof choice.message.content === 'string') return choice.message.content;
      if (Array.isArray(choice.message.content))
        return choice.message.content.map((c: any) => c?.text ?? String(c)).join('');
      return String(choice.message.content.text ?? JSON.stringify(choice.message.content));
    }
    if (choice?.text) return String(choice.text);
    return JSON.stringify(data);
  }
  // Only allow health-related queries otherwise
  if (!isHealthQuery(prompt)) {
    return "Please ask health related queries.";
  }
  const API_KEY = options?.apiKey || ENV?.OPENROUTER_API_KEY;
  if (!API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Provide it via .env file or pass apiKey in options.'
    );
  }
  // Using Gemini (or configured model)
  const model = options?.model || 'openai/gpt-oss-20b:free';
  const BASE_API_URL = options?.baseUrl || ENV?.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  // Add a system message to ensure health-focused responses
  const messages = [
    {
      role: 'system',
      content: options?.systemPrompt || 'You are HeaLora, a FitFaat health coach. Use the user context when available, keep suggestions short and actionable, avoid generic wellness advice, and give today\'s next best action. Add a gentle consult-a-professional disclaimer only for symptoms, medication, diagnosis, injury, or urgent medical concerns.'
    },
    ...(options?.contextPrompt ? [{ role: 'system', content: options.contextPrompt }] : []),
    { role: 'user', content: prompt }
  ];
  const body = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7, // Increased slightly for more creative responses
  } as const;
  const res = await makeAPICall(`${BASE_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://your-app-domain.com',
      'X-Title': 'Bot App',
    },
    body: JSON.stringify(body),
  }, options?.retries ?? 5, options?.baseDelay ?? 1000, options?.timeoutMs ?? 18000);
  const response = res; // alias for clearer error handling
  if (!response.ok) {
    const text = await response.text();
    let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
    const errMsg = parsed?.error?.message || text || `Status ${response.status}`;
    if (response.status === 404 && /No endpoints found/i.test(errMsg)) {
      throw new Error(
        `Provider returned 404 for model '${model}': ${errMsg}. This often means the provider (OpenRouter) does not expose this model under your account or privacy settings. You can: (1) choose a different model supported by OpenRouter, (2) check your OpenRouter privacy/settings at https://openrouter.ai/settings/privacy, or (3) set a different base API URL via ENV.OPENROUTER_BASE_URL or pass options.baseUrl to point at a provider that supports this model.`
      );
    }
    throw new Error(`OpenRouter request failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  // Try several common response shapes for robustness.
  const choice = data?.choices?.[0] ?? null;
  if (choice?.message?.content) {
    if (typeof choice.message.content === 'string') return choice.message.content;
    if (Array.isArray(choice.message.content))
      return choice.message.content.map((c: any) => c?.text ?? String(c)).join('');
    return String(choice.message.content.text ?? JSON.stringify(choice.message.content));
  }
  if (choice?.text) return String(choice.text);
  return JSON.stringify(data);
}

/**
 * Send message to health-only AI chatbot backend
 * Uses Google Gemini API with health-guard filtering
 */
export async function sendChatbotMessage(
  message: string,
  sessionId?: string,
  coachContext?: ChatbotCoachContext
): Promise<{
  userMessage: {
    role: 'user';
    content: string;
    source: string;
    timestamp: string;
  };
  aiResponse: {
    role: 'assistant';
    content: string;
    source: 'food_dataset' | 'exercise_dataset' | 'gemini_ai';
    timestamp: string;
  };
}> {
  try {
    // Get auth token
    const token = await SecureStore.getItemAsync('fitfaat_auth_token');
    if (!token) {
      console.log('No backend auth token found; using direct AI chatbot fallback.');
      return buildDirectChatbotResponse(message.trim(), coachContext);
    }

    const apiUrl = getBackendApiUrl();
    const endpoint = `${apiUrl}/chatbot/message`;

    console.log('Sending message to chatbot:', { message, sessionId, endpoint });

    const data = await requestJson<any>(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          ...(sessionId && { sessionId }),
          ...(coachContext && {
            context: coachContext,
            coachContext,
            promptHints: buildCoachContextPrompt(coachContext),
          }),
        }),
      },
      { timeoutMs: 15000, retries: 0 }
    );

    console.log('Chatbot response received:', {
      success: data.success,
      hasData: !!data.data,
      source: data.data?.aiResponse?.source,
      contentLength: data.data?.aiResponse?.content?.length,
    });

    // Backend returns data in data.data format
    return data.data;
  } catch (error) {
    console.warn('Chatbot API error:', error);

    if (error instanceof ApiRequestError && error.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Network error. Please check your connection.');
  }
}

/**
 * Get chat history
 */
export async function getChatHistory(
  limit: number = 50,
  sessionId?: string
): Promise<Array<{
  role: 'user' | 'assistant';
  content: string;
  source: string;
  timestamp: string;
}>> {
  try {
    const token = await SecureStore.getItemAsync('fitfaat_auth_token');
    if (!token) {
      return [];
    }

    const apiUrl = getBackendApiUrl();
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(sessionId && { sessionId }),
    });
    
    const endpoint = `${apiUrl}/chatbot/history?${params}`;

    const data = await cachedRequestJson<any>(
      `chat-history:${sessionId || 'default'}:${limit}`,
      endpoint,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
      {
        timeoutMs: 7000,
        retries: 1,
        retryDelayMs: 500,
        cacheTtlMs: 2 * 60 * 1000,
        maxStaleMs: 24 * 60 * 60 * 1000,
        allowStaleOnError: true,
        maxWaitForFreshMs: 2500,
        refreshCacheInBackground: true,
      }
    );
    return data.messages || [];
  } catch (error) {
    console.warn('Failed to fetch chat history:', error);
    return [];
  }
}

export default callGemini;
