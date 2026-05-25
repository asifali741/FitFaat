import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from './config';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY_MS = 700;
const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504];
const CACHE_PREFIX = 'fitfaat_request_cache:';
const MEMORY_CACHE_MAX_ENTRIES = 80;

type JsonValue = Record<string, any> | any[] | string | number | boolean | null;

type CachedJsonEnvelope<T> = {
  data: T;
  timestamp: number;
};

export type RequestJsonConfig = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryStatuses?: number[];
  retryUnsafeMethods?: boolean;
};

export type CachedRequestJsonConfig = RequestJsonConfig & {
  cacheTtlMs?: number;
  allowStaleOnError?: boolean;
  maxStaleMs?: number;
  maxWaitForFreshMs?: number;
  refreshCacheInBackground?: boolean;
};

export class ApiRequestError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Get the correct API base URL for the current platform.
 * Uses the centralized config helper for reliable access across all environments.
 */
export const getApiBaseUrl = (): string => {
  return getBackendBaseUrl();
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getMethod = (options?: RequestInit) => (options?.method || 'GET').toUpperCase();

const canRetryMethod = (method: string, retryUnsafeMethods?: boolean) => {
  return retryUnsafeMethods || method === 'GET' || method === 'HEAD';
};

const getErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object') {
    const maybeMessage = (data as { message?: unknown; error?: unknown }).message
      || (data as { message?: unknown; error?: unknown }).error;

    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return fallback;
};

const parseJsonSafely = (text: string): JsonValue | undefined => {
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isRetryableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const name = (error as { name?: string }).name;
  const message = (error as { message?: string }).message || '';

  return (
    name === 'AbortError'
    || /network request failed/i.test(message)
    || /network error/i.test(message)
    || /timeout/i.test(message)
  );
};

export const isRequestAbortError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const name = (error as { name?: string }).name || '';
  const message = (error as { message?: string }).message || '';

  return name === 'AbortError' || /aborted|abort/i.test(message);
};

const shouldRetryResponse = (
  response: Response,
  attempt: number,
  retries: number,
  method: string,
  config: RequestJsonConfig
) => {
  const retryStatuses = config.retryStatuses || DEFAULT_RETRY_STATUSES;
  return (
    attempt < retries
    && canRetryMethod(method, config.retryUnsafeMethods)
    && retryStatuses.includes(response.status)
  );
};

const getCacheKey = (cacheKey: string) => `${CACHE_PREFIX}${cacheKey}`;
const memoryJsonCache = new Map<string, CachedJsonEnvelope<any>>();
const inFlightCachedRequests = new Map<string, Promise<any>>();

const rememberCachedJson = <T>(cacheKey: string, value: CachedJsonEnvelope<T>) => {
  memoryJsonCache.delete(cacheKey);
  memoryJsonCache.set(cacheKey, value);

  if (memoryJsonCache.size > MEMORY_CACHE_MAX_ENTRIES) {
    const oldestKey = memoryJsonCache.keys().next().value;
    if (oldestKey) {
      memoryJsonCache.delete(oldestKey);
    }
  }
};

const readCachedJson = async <T>(cacheKey: string, maxAgeMs?: number) => {
  try {
    const memoryCached = memoryJsonCache.get(cacheKey) as CachedJsonEnvelope<T> | undefined;
    if (memoryCached) {
      const ageMs = Date.now() - memoryCached.timestamp;
      if (maxAgeMs === undefined || ageMs <= maxAgeMs) {
        return memoryCached;
      }
    }

    const raw = await AsyncStorage.getItem(getCacheKey(cacheKey));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedJsonEnvelope<T>;
    if (!cached || typeof cached.timestamp !== 'number') return null;

    const ageMs = Date.now() - cached.timestamp;
    if (maxAgeMs !== undefined && ageMs > maxAgeMs) return null;

    rememberCachedJson(cacheKey, cached);
    return cached;
  } catch {
    return null;
  }
};

const writeCachedJson = async <T>(cacheKey: string, data: T) => {
  try {
    const envelope = { data, timestamp: Date.now() } satisfies CachedJsonEnvelope<T>;
    rememberCachedJson(cacheKey, envelope);
    await AsyncStorage.setItem(
      getCacheKey(cacheKey),
      JSON.stringify(envelope)
    );
  } catch {
    // Cache writes should never block a live request.
  }
};

export const clearRequestJsonCache = async (cacheKey: string) => {
  try {
    memoryJsonCache.delete(cacheKey);
    await AsyncStorage.removeItem(getCacheKey(cacheKey));
  } catch {
    // Best-effort cleanup.
  }
};

export const clearRequestJsonCachesWithPrefix = async (cacheKeyPrefix: string) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter((key) => key.startsWith(getCacheKey(cacheKeyPrefix)));
    Array.from(memoryJsonCache.keys())
      .filter((key) => key.startsWith(cacheKeyPrefix))
      .forEach((key) => memoryJsonCache.delete(key));
    if (matchingKeys.length) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch {
    // Best-effort cleanup.
  }
};

export const clearAllRequestJsonCaches = async () => {
  try {
    memoryJsonCache.clear();
    inFlightCachedRequests.clear();
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (matchingKeys.length) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch {
    // Best-effort cleanup.
  }
};

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const parentSignal = options.signal;

  const abortFromParent = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener?.('abort', abortFromParent);
  }
};

export const requestJson = async <T = any>(
  url: string,
  options: RequestInit = {},
  config: RequestJsonConfig = {}
): Promise<T> => {
  const retries = config.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = getMethod(options);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      const text = await response.text();
      const data = parseJsonSafely(text);

      if (response.ok) {
        return data as T;
      }

      if (shouldRetryResponse(response, attempt, retries, method, config)) {
        await delay(retryDelayMs * Math.pow(2, attempt));
        continue;
      }

      throw new ApiRequestError(
        getErrorMessage(data, `Request failed with status ${response.status}`),
        response.status,
        data
      );
    } catch (error) {
      lastError = error;
      const shouldRetry = (
        attempt < retries
        && canRetryMethod(method, config.retryUnsafeMethods)
        && isRetryableError(error)
      );

      if (!shouldRetry) {
        if (error instanceof ApiRequestError) throw error;
        if (error instanceof Error) throw error;
        throw new Error('Network request failed');
      }

      await delay(retryDelayMs * Math.pow(2, attempt));
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('Network request failed');
};

export const cachedRequestJson = async <T = any>(
  cacheKey: string,
  url: string,
  options: RequestInit = {},
  config: CachedRequestJsonConfig = {}
): Promise<T> => {
  const cacheTtlMs = config.cacheTtlMs;
  const maxStaleMs = config.maxStaleMs;
  const cached = await readCachedJson<T>(cacheKey, maxStaleMs);
  const freshCached = cacheTtlMs ? await readCachedJson<T>(cacheKey, cacheTtlMs) : null;

  if (freshCached && config.maxWaitForFreshMs === 0) {
    return freshCached.data;
  }

  const fetchAndCache = async (requestOptions: RequestInit = options) => {
    const inFlightKey = `${cacheKey}:${getMethod(requestOptions)}`;
    const canShareRequest = !requestOptions.signal;
    if (canShareRequest) {
      const existingRequest = inFlightCachedRequests.get(inFlightKey) as Promise<T> | undefined;
      if (existingRequest) {
        return existingRequest;
      }
    }

    const requestPromise = requestJson<T>(url, requestOptions, config).then(async (data) => {
      await writeCachedJson(cacheKey, data);
      return data;
    });
    if (canShareRequest) {
      inFlightCachedRequests.set(inFlightKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (canShareRequest) {
        inFlightCachedRequests.delete(inFlightKey);
      }
    }
  };

  if (cached && config.maxWaitForFreshMs && config.maxWaitForFreshMs > 0) {
    const controller = new AbortController();
    let returnedCached = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const requestOptions = config.refreshCacheInBackground
      ? options
      : { ...options, signal: controller.signal };

    const networkPromise = fetchAndCache(requestOptions).catch((error) => {
      if (returnedCached || config.allowStaleOnError) {
        return cached.data;
      }
      throw error;
    });

    const fallbackPromise = new Promise<T>((resolve) => {
      fallbackTimer = setTimeout(() => {
        returnedCached = true;
        if (!config.refreshCacheInBackground) {
          controller.abort();
        }
        resolve(cached.data);
      }, config.maxWaitForFreshMs);
    });

    try {
      return await Promise.race([networkPromise, fallbackPromise]);
    } finally {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    }
  }

  try {
    return await fetchAndCache();
  } catch (error) {
    if (cached && config.allowStaleOnError) {
      return cached.data;
    }
    throw error;
  }
};

/**
 * Test the API connection.
 */
export const testApiConnection = async (): Promise<{
  connected: boolean;
  message: string;
  data?: any;
  error?: any;
}> => {
  try {
    const url = `${getApiBaseUrl()}/api/admin/news/published`;
    console.log('Testing connection to:', url);

    const data = await requestJson(url, { method: 'GET' }, { timeoutMs: 5000, retries: 1 });

    return {
      connected: true,
      message: 'API connection successful!',
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      connected: false,
      message: `Connection failed: ${message}`,
      error,
    };
  }
};
