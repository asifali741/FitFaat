import { authApi } from '@/utils/auth/authApi';
import { useState } from 'react';

export const useAppointmentBooking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const bookAppointment = async (appointmentData: {
    doctorId: string;
    date: string;
    time: string;
    price: number;
    description?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authApi.bookAppointment(appointmentData);
      setSuccessMessage(response.message || 'Appointment booked successfully!');
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to book appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserAppointments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.getUserAppointments();
      return response.appointments || [];
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch appointments';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.cancelAppointment(appointmentId, reason);
      setSuccessMessage(response.message || 'Appointment cancelled successfully!');
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return {
    bookAppointment,
    getUserAppointments,
    cancelAppointment,
    isLoading,
    error,
    successMessage,
    clearMessages
  };
};
