import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authApi } from '../utils/auth/authApi';

export const useDoctorRegistration = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submitDoctorRegistration = async (doctorData: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    age?: number;
    gender: 'male' | 'female' | 'other';
    bio?: string;
    licenseNumber: string;
    licenseAuthority: string;
    registrationYear: number;
    yearsOfExperience: number;
    specialization: string;
    qualifications: string;
    university: string;
    domain: string;
    jobType: string;
    clinicName?: string;
    clinicAddress?: string;
    consultationFee?: number;
    availableDays?: string[];
    availableHours?: { startTime: string; endTime: string };
    consultationMode: string[];
    languages?: string[];
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authApi.submitDoctorRegistration(doctorData);
      
      setSuccessMessage(response.message || 'Registration submitted successfully!');
      
      // Navigate to success screen after 2 seconds
      setTimeout(() => {
        router.push('/(main)/(doctor-portal)/application-status');
      }, 2000);

      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit doctor registration';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getDoctorStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.getDoctorStatus();
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch doctor status';
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
    submitDoctorRegistration,
    getDoctorStatus,
    isLoading,
    error,
    successMessage,
    clearMessages
  };
};
