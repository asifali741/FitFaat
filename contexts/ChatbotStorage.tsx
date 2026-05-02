import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  messages: ChatMessage[];
}

interface ChatbotStorageContextType {
  // Current session
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  
  // Session management
  sessions: ChatSession[];
  createNewSession: () => string;
  switchToSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  
  // Message management
  addMessage: (text: string, isUser: boolean) => void;
  clearCurrentSession: () => void;
  
  // Storage management
  clearAllChats: () => Promise<void>;
  exportChats: () => Promise<string>;
  
  // Loading state
  isLoading: boolean;
}

const ChatbotStorageContext = createContext<ChatbotStorageContextType | undefined>(undefined);

export const useChatbotStorage = () => {
  const context = useContext(ChatbotStorageContext);
  if (!context) {
    throw new Error('useChatbotStorage must be used within a ChatbotStorageProvider');
  }
  return context;
};

interface ChatbotStorageProviderProps {
  children: ReactNode;
}

export const ChatbotStorageProvider: React.FC<ChatbotStorageProviderProps> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions from AsyncStorage on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Save sessions to AsyncStorage whenever sessions change
  useEffect(() => {
    if (!isLoading) {
      saveSessions();
    }
  }, [sessions, isLoading]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem('chatbot_sessions');
      if (stored) {
        const parsedSessions = JSON.parse(stored).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastMessageAt: new Date(session.lastMessageAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setSessions(parsedSessions);
        
        // Set the most recent session as current if no current session
        if (parsedSessions.length > 0 && !currentSession) {
          const mostRecent = parsedSessions.sort((a: ChatSession, b: ChatSession) => 
            b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
          )[0];
          setCurrentSession(mostRecent);
          setMessages(mostRecent.messages);
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessions = async () => {
    try {
      await AsyncStorage.setItem('chatbot_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  };

  const createNewSession = (): string => {
    const sessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: sessionId,
      title: 'New Chat',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      messages: []
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    return sessionId;
  };

  const switchToSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSession(remainingSessions[0]);
      } else {
        setCurrentSession(null);
      }
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    // If no session exists, we still need to add the message to a new session
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      // We'll handle this by creating message and letting sessions/currentSession updates handle it
    }

    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      isUser,
      timestamp: new Date(),
      sessionId: sessionToUse?.id || Date.now().toString()
    };

    // Create or update session
    if (!sessionToUse) {
      const newSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: newSessionId,
        title: text.length > 30 ? text.substring(0, 30) + '...' : text,
        createdAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: 1,
        messages: [message]
      };
      sessionToUse = newSession;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([message]);
      return;
    }

    const updatedSession: ChatSession = {
      ...sessionToUse,
      messages: [...sessionToUse.messages, message],
      lastMessageAt: new Date(),
      messageCount: sessionToUse.messageCount + 1,
      title: sessionToUse.messageCount === 0 ? 
        (text.length > 30 ? text.substring(0, 30) + '...' : text) : 
        sessionToUse.title
    };

    setSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === sessionToUse.id);
      if (existingIndex >= 0) {
        return prev.map(s => s.id === sessionToUse.id ? updatedSession : s);
      } else {
        return [updatedSession, ...prev];
      }
    });
    
    setCurrentSession(updatedSession);
    setMessages(updatedSession.messages);
  };

  const clearCurrentSession = () => {
    if (currentSession) {
      const clearedSession: ChatSession = {
        ...currentSession,
        messages: [],
        messageCount: 0,
        title: 'New Chat'
      };
      
      setSessions(prev => 
        prev.map(s => s.id === currentSession.id ? clearedSession : s)
      );
      setCurrentSession(clearedSession);
    }
  };

  const clearAllChats = async () => {
    try {
      await AsyncStorage.removeItem('chatbot_sessions');
      setSessions([]);
      setCurrentSession(null);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing all chats:', error);
    }
  };

  const exportChats = async (): Promise<string> => {
    try {
      const exportData = {
        sessions: sessions.map(session => ({
          ...session,
          messages: session.messages.map(msg => ({
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp.toISOString()
          }))
        })),
        exportedAt: new Date().toISOString(),
        totalSessions: sessions.length,
        totalMessages: sessions.reduce((sum, session) => sum + session.messageCount, 0)
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting chats:', error);
      throw error;
    }
  };

  const value: ChatbotStorageContextType = {
    currentSession,
    messages,
    sessions,
    createNewSession,
    switchToSession,
    deleteSession,
    addMessage,
    clearCurrentSession,
    clearAllChats,
    exportChats,
    isLoading
  };

  return (
    <ChatbotStorageContext.Provider value={value}>
      {children}
    </ChatbotStorageContext.Provider>
  );
};
