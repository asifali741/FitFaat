import { useState } from 'react';
import { authApi } from '../utils/auth/authApi';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
type FitnessGoal = 1 | 2 | 3; // 1: Weight Loss, 2: Muscle Gain, 3: Weight Gain

export interface BmiSummaryData {
  bmi: number;           // kg/m²
  goalCalories: number;  // kcal/day
  hydrationGoal: number; // liters/day
}

export const useUserMetrics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bmiSummary, setBmiSummary] = useState<BmiSummaryData | null>(null);

  const updateBmiSummary = async (data: {
    height: number;
    weight: number;
    gender: 'male' | 'female' | 'other';
    age: number;
    activityLevel: ActivityLevel;
    fitnessGoal: FitnessGoal;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.updateBmiSummary(data);
      setBmiSummary(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update BMI summary';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateBmiSummary,
    bmiSummary,
    isLoading,
    error
  };
};