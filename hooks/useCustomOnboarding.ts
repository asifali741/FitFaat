import { useRouter } from 'expo-router';
import { useState } from 'react';
import { authApi } from '../utils/auth/authApi';

export const useCustomOnboarding = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = async (userInfo: {
    name: string;
    height: string; // feet.inches as string
    weight: string;
    selectedGender: 'male' | 'female' | 'other';
    selectedGoal: number;
    birthDate: { day: string; month: string; year: string };
    age?: number;
  }) => {
    setIsLoading(true);
    try {
      // Convert height from feet.inches to centimeters
      const heightFeet = parseFloat(userInfo.height);
      const heightInCm = heightFeet * 30.48;

      // Convert string values to numbers where needed and send to backend
      await authApi.completeOnboarding({
        name: userInfo.name.trim(),
        height: heightInCm,
        weight: parseFloat(userInfo.weight),
        gender: userInfo.selectedGender,
        birthDate: {
          day: parseInt(userInfo.birthDate.day, 10),
          month: parseInt(userInfo.birthDate.month, 10),
          year: parseInt(userInfo.birthDate.year, 10)
        },
        age: userInfo.age,
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