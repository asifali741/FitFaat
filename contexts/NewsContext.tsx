import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

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

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());

  // Get the correct API URL based on platform
  const getApiUrl = () => {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5001';
    }
    return 'http://localhost:5001';
  };

  const API_BASE_URL = getApiUrl();

  // Load read news from storage
  const loadReadNews = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        setReadNewsIds(new Set(ids));
        console.log('✅ Loaded read news:', ids.length, 'items');
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
  const markNewsAsRead = async (newsId: string) => {
    const newReadIds = new Set(readNewsIds);
    newReadIds.add(newsId);
    setReadNewsIds(newReadIds);
    await saveReadNews(newReadIds);
    console.log('📖 Marked as read:', newsId);
  };

  const fetchPublishedNews = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = `${API_BASE_URL}/api/admin/news/published`;
      console.log('📰 Fetching from:', apiUrl, 'Platform:', Platform.OS);

      const response = await axios.get(apiUrl, {
        timeout: 10000,
      });

      const newsList = response.data?.data || [];
      console.log('📰 News count:', newsList.length);

      // Find newly added items
      const newlyAdded = newsList.filter(
        (item: NewsItem) => !previousIdsRef.current.has(item._id || item.id || '')
      );

      console.log('🆕 New items:', newlyAdded.length);

      // Update tracking
      const currentIds: Set<string> = new Set(
        newsList.map((n: NewsItem) => (n._id || n.id || '') as string)
      );
      previousIdsRef.current = currentIds;
      setNews(newsList);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.message : 'Failed to fetch';
      setError(message);
      console.error('❌ Error:', message);
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    await fetchPublishedNews();
  };

  useEffect(() => {
    console.log('🚀 NewsProvider Init - Platform:', Platform.OS);
    loadReadNews();
    fetchPublishedNews();

    pollIntervalRef.current = setInterval(() => {
      console.log('⏰ Poll check...');
      fetchPublishedNews();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Calculate unread count
  const unreadCount = news.filter((item) => !readNewsIds.has(item._id || item.id || '')).length;

  const value: NewsContextType = {
    news,
    loading,
    error,
    unreadCount,
    fetchPublishedNews,
    refreshNews,
    markNewsAsRead,
  };

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within NewsProvider');
  }
  return context;
};
