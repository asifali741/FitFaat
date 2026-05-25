import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface Appointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorExperience: string;
  doctorFee: string;
  date: string;
  time: string;
  problemDescription: string;
  appointmentDateTime: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'status'>) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  getUpcomingAppointments: () => Appointment[];
  getActiveAppointments: () => Appointment[];
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};

interface AppointmentProviderProps {
  children: ReactNode;
}

export const AppointmentProvider: React.FC<AppointmentProviderProps> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const hasLoadedRef = useRef(false);

  const loadAppointments = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      if (stored) {
        const parsedAppointments = JSON.parse(stored).map((apt: any) => ({
          ...apt,
          appointmentDateTime: new Date(apt.appointmentDateTime)
        }));
        setAppointments(parsedAppointments);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      hasLoadedRef.current = true;
    }
  }, []);

  const saveAppointments = useCallback(async () => {
    try {
      await AsyncStorage.setItem('appointments', JSON.stringify(appointments));
    } catch (error) {
      console.error('Error saving appointments:', error);
    }
  }, [appointments]);

  // Load appointments from AsyncStorage on mount
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Save appointments to AsyncStorage whenever appointments change
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveAppointments();
    }
  }, [saveAppointments]);

  const addAppointment = useCallback((appointmentData: Omit<Appointment, 'status'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: appointmentData.id || Date.now().toString(),
      status: 'scheduled'
    };
    setAppointments(prev => [...prev, newAppointment]);
  }, []);

  const updateAppointmentStatus = useCallback((id: string, status: Appointment['status']) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === id ? { ...apt, status } : apt
      )
    );
  }, []);

  const getUpcomingAppointments = useCallback(() => {
    const now = new Date();
    return appointments
      .filter(apt => apt.appointmentDateTime > now && apt.status === 'scheduled')
      .sort((a, b) => a.appointmentDateTime.getTime() - b.appointmentDateTime.getTime());
  }, [appointments]);

  const getActiveAppointments = useCallback(() => {
    const now = new Date();
    return appointments.filter(apt => 
      apt.status === 'scheduled' && 
      apt.appointmentDateTime <= now && 
      apt.appointmentDateTime.getTime() + (2 * 60 * 60 * 1000) > now.getTime() // 2 hours window
    );
  }, [appointments]);

  const value: AppointmentContextType = useMemo(
    () => ({
      appointments,
      addAppointment,
      updateAppointmentStatus,
      getUpcomingAppointments,
      getActiveAppointments,
    }),
    [addAppointment, appointments, getActiveAppointments, getUpcomingAppointments, updateAppointmentStatus]
  );

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};
