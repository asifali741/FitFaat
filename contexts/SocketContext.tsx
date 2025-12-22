import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

const ENV = Constants.expoConfig?.extra;
const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
          console.log('⚠️ [SOCKET PROVIDER] No auth token, skipping socket init');
          return;
        }

        console.log('🌐 [SOCKET PROVIDER] Initializing shared socket connection');
        const socket = io(API_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ [SOCKET PROVIDER] Shared socket connected, ID:', socket.id);
          setIsConnected(true);
        });

        socket.on('disconnect', (reason) => {
          console.log('⚠️ [SOCKET PROVIDER] Shared socket disconnected, reason:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ [SOCKET PROVIDER] Connection error:', error.message);
        });

      } catch (error) {
        console.error('❌ [SOCKET PROVIDER] Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      console.log('🌐 [SOCKET PROVIDER] Cleaning up shared socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
