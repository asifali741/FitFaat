import AppointmentChat from '@/components/AppointmentChat';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function AppointmentChatScreen() {
  const params = useLocalSearchParams();
  const appointmentId = Array.isArray(params.appointmentId) 
    ? params.appointmentId[0] 
    : params.appointmentId;

  return <AppointmentChat appointmentId={appointmentId} />;
}
