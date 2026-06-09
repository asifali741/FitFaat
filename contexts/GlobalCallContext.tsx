import IncomingCallModal from '@/components/IncomingCallModal';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { getBackendBaseUrl, isRealtimeSocketEnabled } from '@/utils/config';

interface IncomingCall {
  callerId: string;
  callerName: string;
  chatSessionId: string;
  callerRole?: 'user' | 'doctor';
}

interface GlobalCallContextType {
  socket: Socket | null;
  incomingCall: IncomingCall | null;
  acceptCall: () => void;
  rejectCall: () => void;
}

const GlobalCallContext = createContext<GlobalCallContextType | null>(null);

export const useGlobalCall = () => {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error('useGlobalCall must be used within GlobalCallProvider');
  }
  return context;
};

const ENV = Constants.expoConfig?.extra;
const API_URL = getBackendBaseUrl();

export const GlobalCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      try {
        if (!isRealtimeSocketEnabled()) return;

        const token = await tokenStorage.getToken();
        if (!token) return;

        console.log('🌐 [GLOBAL CALL] Initializing global socket connection');
        const socket = io(API_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ [GLOBAL CALL] Global socket connected, ID:', socket.id);
        });

        socket.on('disconnect', () => {
          console.log('⚠️ [GLOBAL CALL] Global socket disconnected');
        });

        // Listen for incoming calls globally
        socket.on('call:incoming', (data: IncomingCall) => {
          console.log('📞 [GLOBAL CALL] Incoming call received:', data);
          setIncomingCall(data);
        });

        // Listen for call ended
        socket.on('call:ended', (data: { endedBy: string; reason?: string }) => {
          console.log('📴 [GLOBAL CALL] Call ended:', data);
          setIncomingCall(null);
        });

        // Listen for call rejected
        socket.on('call:rejected', () => {
          console.log('❌ [GLOBAL CALL] Call rejected');
          setIncomingCall(null);
        });

      } catch (error) {
        console.error('❌ [GLOBAL CALL] Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      console.log('🌐 [GLOBAL CALL] Cleaning up global socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const acceptCall = () => {
    if (!socketRef.current || !incomingCall) {
      console.log('⚠️ [GLOBAL CALL] Cannot accept call - socket or incoming call missing');
      return;
    }

    console.log('✅ [GLOBAL CALL] Accepting call from:', incomingCall.callerName);
    
    socketRef.current.emit('call:accept', {
      callerId: incomingCall.callerId,
      chatSessionId: incomingCall.chatSessionId,
    });

    // Navigate to video call screen
    router.push({
      pathname: '/(main)/(conference)/video-call',
      params: {
        callId: incomingCall.chatSessionId,
        userName: incomingCall.callerName,
        appointmentId: incomingCall.chatSessionId,
      },
    });

    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!socketRef.current || !incomingCall) {
      console.log('⚠️ [GLOBAL CALL] Cannot reject call - socket or incoming call missing');
      return;
    }

    console.log('❌ [GLOBAL CALL] Rejecting call from:', incomingCall.callerName);

    socketRef.current.emit('call:reject', {
      callerId: incomingCall.callerId,
      chatSessionId: incomingCall.chatSessionId,
      reason: 'Call declined by user',
    });

    setIncomingCall(null);
  };

  return (
    <GlobalCallContext.Provider
      value={{
        socket: socketRef.current,
        incomingCall,
        acceptCall,
        rejectCall,
      }}
    >
      {children}
      
      {/* Global Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          visible={true}
          callerName={incomingCall.callerName}
          callerRole={incomingCall.callerRole || 'user'}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </GlobalCallContext.Provider>
  );
};
