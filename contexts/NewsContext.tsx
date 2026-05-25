import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getBackendBaseUrl } from '@/utils/config';
import { useNotifications } from '@/contexts/NotificationContext';
import { cachedRequestJson } from '@/utils/apiHelper';

interface NewsItem {
  _id: string;
  id?: string;
  title: string;
  description: string;
  image?: string;
  category: 'health' | 'fitness' | 'nutrition' | 'wellness' | 'general';
  adminId?: string;
  adminName?: string;
  isPublished: boolean;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  fetchPublishedNews: () => Promise<void>;
  refreshNews: () => Promise<void>;
  markNewsAsRead: (newsId: string) => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const STORAGE_KEY = 'fitfaat_read_news';
const NEWS_POLL_INTERVAL_MS = 5 * 60 * 1000;
const NEWS_READ_CONFIG = {
  timeoutMs: 7000,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 5 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 2200,
  refreshCacheInBackground: true,
};

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendFitFaatNotification } = useNotifications();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);
  const lastErrorLogRef = useRef('');

  const API_BASE_URL = getBackendBaseUrl();

  // Load read news from storage
  const loadReadNews = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        setReadNewsIds(new Set(ids));
        
      }
    } catch (err) {
      console.error('Error loading read news:', err);
    }
  };

  // Save read news to storage
  const saveReadNews = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.error('Error saving read news:', err);
    }
  };

  // Mark a news item as read
  const markNewsAsRead = useCallback(async (newsId: string) => {
    const newReadIds = new Set(readNewsIds);
    newReadIds.add(newsId);
    setReadNewsIds(newReadIds);
    await saveReadNews(newReadIds);
    console.log('📖 Marked as read:', newsId);
  }, [readNewsIds]);

  const fetchPublishedNews = useCallback(async () => {
    try {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);

      const apiUrl = `${API_BASE_URL}/api/admin/news/published`;

      const response = await cachedRequestJson<any>(
        'news:published',
        apiUrl,
        { method: 'GET' },
        NEWS_READ_CONFIG
      );

      const newsList = response?.data || [];

      const newlyAdded = hasLoadedOnceRef.current
        ? newsList.filter(
            (item: NewsItem) => !previousIdsRef.current.has(item._id || item.id || '')
          )
        : [];

      // Update tracking
      const currentIds: Set<string> = new Set(
        newsList.map((n: NewsItem) => (n._id || n.id || '') as string)
      );
      previousIdsRef.current = currentIds;
      setNews(newsList);

      if (newlyAdded.length > 0) {
        const latestItem = newlyAdded[0];
        sendFitFaatNotification(
          'news',
          'New Health Update',
          latestItem.title,
          { newsId: latestItem._id || latestItem.id }
        ).catch((notificationError) => {
          console.error('Error sending news notification:', notificationError);
        });
      }

      hasLoadedOnceRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
      if (lastErrorLogRef.current !== message) {
        lastErrorLogRef.current = message;
        console.warn('[News] Published news unavailable:', message);
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, sendFitFaatNotification]);

  const refreshNews = useCallback(async () => {
    await fetchPublishedNews();
  }, [fetchPublishedNews]);

  useEffect(() => {
    
    loadReadNews();
    fetchPublishedNews();

    pollIntervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchPublishedNews();
      }
    }, NEWS_POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchPublishedNews();
      }
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      subscription.remove();
    };
  }, [fetchPublishedNews]);

  // Calculate unread count
  const unreadCount = useMemo(
    () => news.filter((item) => !readNewsIds.has(item._id || item.id || '')).length,
    [news, readNewsIds]
  );

  const value: NewsContextType = useMemo(
    () => ({
      news,
      loading,
      error,
      unreadCount,
      fetchPublishedNews,
      refreshNews,
      markNewsAsRead,
    }),
    [error, fetchPublishedNews, loading, markNewsAsRead, news, refreshNews, unreadCount]
  );

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within NewsProvider');
  }
  return context;
};
