import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authApi } from '../utils/auth/authApi';

export const useCustomOnboarding = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = async (userInfo: {
    name: string;
    height: string;
    weight: string;
    selectedGender: 'male' | 'female' | 'other';
    selectedGoal: number;
    birthDate: { day: string; month: string; year: string };
  }) => {
    setIsLoading(true);
    try {
      // Convert string values to numbers where needed
      await authApi.completeOnboarding({
        name: userInfo.name.trim(),
        height: parseFloat(userInfo.height),
        weight: parseFloat(userInfo.weight),
        gender: userInfo.selectedGender,
        birthDate: {
          day: parseInt(userInfo.birthDate.day),
          month: parseInt(userInfo.birthDate.month),
          year: parseInt(userInfo.birthDate.year)
        },
        fitnessGoal: userInfo.selectedGoal
      });

      // Navigate to main app after successful onboarding
      router.replace('/(main)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    completeOnboarding,
    isLoading
  };
};