import { tokenStorage } from '@/utils/auth/tokenStorage';
import { useEffect, useState } from 'react';

// Remove /api from BACKEND_URL since routes already include it
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://localhost:5001').replace('/api', '');

/**
 * Hook to check if chat is available for an appointment
 * @param appointmentId - The appointment ID
 * @returns {Object} - { canChat, userRole, loading, error, checkAccess }
 */
export const useChatAccess = (appointmentId: string) => {
  const [canChat, setCanChat] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'doctor' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await tokenStorage.getToken();
      if (!token) {
        setCanChat(false);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/access`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('Chat access check response:', data);

      if (data.success && data.allowed) {
        setCanChat(true);
        setUserRole(data.userRole);
        console.log('Chat access granted:', { canChat: true, userRole: data.userRole });
      } else {
        setCanChat(false);
        setError(data.message);
        console.log('Chat access denied:', data.message);
      }
    } catch (err) {
      console.error('Error checking chat access:', err);
      setCanChat(false);
      setError('Failed to check chat access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [appointmentId]);

  return { canChat, userRole, loading, error, checkAccess };
};

/**
 * Hook to determine if chat button should be visible based on appointment and user role
 * @param appointment - The appointment object
 * @param userRole - 'user' or 'doctor'
 * @returns {boolean} - Whether chat button should be visible
 */
export const shouldShowChatButton = (appointment: any, userRole: 'user' | 'doctor') => {
  if (!appointment) return false;

  const now = new Date();
  const appointmentDate = new Date(appointment.date);
  
  // Parse time
  const timeParts = appointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) return false;
  
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const period = timeParts[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  appointmentDate.setHours(hours, minutes, 0, 0);
  
  const appointmentEndTime = new Date(appointmentDate);
  appointmentEndTime.setHours(appointmentEndTime.getHours() + 1);
  
  // Check status
  if (!['confirmed', 'pending'].includes(appointment.status)) {
    return false;
  }
  
  // Check if appointment has ended
  if (now > appointmentEndTime) {
    return false;
  }
  
  // Doctor can see button before and during
  if (userRole === 'doctor') {
    return true;
  }
  
  // User can see button only during appointment (30 minutes before to allow early access)
  if (userRole === 'user') {
    const earlyAccessTime = new Date(appointmentDate);
    earlyAccessTime.setMinutes(earlyAccessTime.getMinutes() - 30);
    
    return now >= earlyAccessTime && now <= appointmentEndTime;
  }
  
  return false;
};
