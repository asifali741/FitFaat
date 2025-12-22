import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Socket } from 'socket.io-client';

interface UseVideoCallParams {
  socketRef: React.MutableRefObject<Socket | null>;
  appointmentId: string;
  userRole: 'user' | 'doctor' | null;
  otherUserId?: string;
  otherUserName?: string;
  canSend: boolean; // Chat access permission
  isInVideoCallRef?: React.MutableRefObject<boolean>; // Track if in video call
}

interface IncomingCallData {
  callerId: string;
  callerName: string;
  callerRole: 'user' | 'doctor';
  chatSessionId: string;
}

export function useVideoCall({
  socketRef,
  appointmentId,
  userRole,
  otherUserId,
  otherUserName,
  canSend,
  isInVideoCallRef,
}: UseVideoCallParams) {
  const router = useRouter();
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Listen for incoming call
    socket.on('call:incoming', (data: IncomingCallData) => {
      console.log('📞 Incoming call from:', data.callerName);
      setIncomingCall(data);
    });

    // Listen for call accepted
    socket.on('call:accepted', (data: { receiverId: string; chatSessionId: string }) => {
      console.log('✅ Call accepted by receiver');
      setIsInitiatingCall(false);
      setIsCallInProgress(true);
      
      // Mark that we're entering video call
      if (isInVideoCallRef) {
        isInVideoCallRef.current = true;
      }
      
      // Navigate to video call screen
      router.push({
        pathname: '/(main)/(conference)/video-call',
        params: {
          callId: appointmentId,
          userName: otherUserName || 'User',
          appointmentId: appointmentId,
        },
      });
    });

    // Listen for call rejected
    socket.on('call:rejected', (data: { reason?: string }) => {
      console.log('❌ Call rejected:', data.reason);
      setIsInitiatingCall(false);
      setIncomingCall(null);
      Alert.alert('Call Declined', data.reason || 'The other user declined the call.');
    });

    // Listen for call ended
    socket.on('call:ended', (data: { endedBy: string; reason?: string }) => {
      console.log('📴 Call ended:', data);
      setIsCallInProgress(false);
      setIncomingCall(null);
      setIsInitiatingCall(false);
      
      // Mark that we're exiting video call
      if (isInVideoCallRef) {
        isInVideoCallRef.current = false;
      }
      
      if (data.reason) {
        Alert.alert('Call Ended', data.reason);
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socketRef, appointmentId, otherUserName, router]);

  const initiateCall = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      Alert.alert('Connection Error', 'Not connected to server. Please try again.');
      return;
    }

    if (!canSend) {
      Alert.alert(
        'Chat Access Required',
        'You need chat access before starting a video call.'
      );
      return;
    }

    if (!otherUserId || !userRole) {
      Alert.alert('Error', 'Unable to initiate call. Missing user information.');
      return;
    }

    if (isCallInProgress) {
      Alert.alert('Call in Progress', 'A call is already in progress.');
      return;
    }

    console.log('📞 Initiating call to:', otherUserName);
    setIsInitiatingCall(true);

    // Emit call initiation event
    socketRef.current.emit('call:initiate', {
      callerId: userRole === 'doctor' ? 'doctor' : 'user', // Current user
      receiverId: otherUserId,
      callerRole: userRole,
      chatSessionId: appointmentId,
    });

    // Set timeout for call initiation (30 seconds)
    setTimeout(() => {
      if (isInitiatingCall) {
        setIsInitiatingCall(false);
        Alert.alert('Call Timeout', 'The other user did not respond.');
      }
    }, 30000);
  };

  const acceptCall = () => {
    if (!socketRef.current || !incomingCall) return;

    console.log('✅ Accepting call from:', incomingCall.callerName);
    
    socketRef.current.emit('call:accept', {
      callerId: incomingCall.callerId,
      chatSessionId: incomingCall.chatSessionId,
    });

    setIncomingCall(null);
    setIsCallInProgress(true);

    // Mark that we're entering video call
    if (isInVideoCallRef) {
      isInVideoCallRef.current = true;
    }

    // Navigate to video call screen
    router.push({
      pathname: '/(main)/(conference)/video-call',
      params: {
        callId: appointmentId,
        userName: otherUserName || 'User',
        appointmentId: appointmentId,
      },
    });
  };

  const rejectCall = () => {
    if (!socketRef.current || !incomingCall) return;

    console.log('❌ Rejecting call from:', incomingCall.callerName);
    
    socketRef.current.emit('call:reject', {
      callerId: incomingCall.callerId,
      chatSessionId: incomingCall.chatSessionId,
      reason: 'Call declined by user',
    });

    setIncomingCall(null);
  };

  const endCall = () => {
    if (!socketRef.current) return;

    console.log('📴 Ending call');
    
    socketRef.current.emit('call:end', {
      chatSessionId: appointmentId,
      reason: 'Call ended by user',
    });

    setIsCallInProgress(false);
  };

  // Check if video call is available
  const isVideoCallAvailable = () => {
    return (
      canSend && // Chat access granted
      !isCallInProgress && // No active call
      socketRef.current?.connected && // Socket connected
      userRole !== null // User role defined
    );
  };

  return {
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    incomingCall,
    isCallInProgress,
    isInitiatingCall,
    isVideoCallAvailable: isVideoCallAvailable(),
  };
}
