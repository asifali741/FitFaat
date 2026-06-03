import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../utils/auth/authApi';
import { tokenStorage } from '../utils/auth/tokenStorage';

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

      const heightInCmRounded = Math.round(heightInCm * 10) / 10;
      const weightInKg = parseFloat(userInfo.weight);
      const startingWeightRecordedAt = new Date().toISOString();

      const response = await authApi.completeOnboarding({
        name: userInfo.name.trim(),
        height: heightInCmRounded,
        weight: weightInKg,
        gender: userInfo.selectedGender,
        birthDate: {
          day: parseInt(userInfo.birthDate.day, 10),
          month: parseInt(userInfo.birthDate.month, 10),
          year: parseInt(userInfo.birthDate.year, 10)
        },
        age: userInfo.age,
        fitnessGoal: userInfo.selectedGoal
      });

      await AsyncStorage.setItem('fitfaat_health_metrics', JSON.stringify({
        height: heightInCmRounded,
        weight: weightInKg,
        weightKg: weightInKg,
        currentWeight: weightInKg,
        startingWeightKg: weightInKg,
        startingWeightRecordedAt,
        gender: userInfo.selectedGender,
        birthDate: {
          day: parseInt(userInfo.birthDate.day, 10),
          month: parseInt(userInfo.birthDate.month, 10),
          year: parseInt(userInfo.birthDate.year, 10)
        },
        age: userInfo.age,
        selectedGoal: userInfo.selectedGoal,
        fitnessGoal: userInfo.selectedGoal,
      }));

      const savedUser = await tokenStorage.getUser();
      const updatedUser = response?.user || response?.data?.user;
      if (updatedUser) {
        await tokenStorage.saveUser({
          ...updatedUser,
          healthMetrics: {
            ...(updatedUser.healthMetrics || {}),
            startingWeightKg: weightInKg,
            startingWeightRecordedAt,
          },
          userInfo: {
            ...(updatedUser.userInfo || {}),
            startingWeightKg: weightInKg,
            startingWeightRecordedAt,
          },
        });
      } else if (savedUser) {
        await tokenStorage.saveUser({
          ...savedUser,
          userInfo: {
            ...(savedUser.userInfo || {}),
            name: userInfo.name.trim(),
            height: heightInCmRounded,
            weight: weightInKg,
            weightKg: weightInKg,
            currentWeight: weightInKg,
            startingWeightKg: weightInKg,
            startingWeightRecordedAt,
            gender: userInfo.selectedGender,
            birthDate: {
              day: parseInt(userInfo.birthDate.day, 10),
              month: parseInt(userInfo.birthDate.month, 10),
              year: parseInt(userInfo.birthDate.year, 10)
            },
            age: userInfo.age,
            fitnessGoal: userInfo.selectedGoal,
          },
        });
      }

      await AsyncStorage.setItem('fitfaat_onboarding_first_log_nudge', '1');

      // Navigate to dashboard after successful onboarding
      router.replace('/(main)/(dashboard)');
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
