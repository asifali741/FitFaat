import { useEffect, useState } from 'react';
import { streakApi } from '@/utils/streakApi';

interface StreakData {
  streakCount: number;
  longestStreak: number;
  lastEntryDate: string | null;
  message: string;
  shouldSendReminder: boolean;
  streakPercentage: number;
}

export const useStreak = (userId: string | null) => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStreak(null);
      return;
    }

    const fetchStreak = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await streakApi.getUserStreak(userId);
        setStreak(data);
      } catch (err) {
        console.error('Error fetching streak:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch streak');
        setStreak(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
    // Refresh streak every 5 minutes
    const interval = setInterval(fetchStreak, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const refetchStreak = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await streakApi.getUserStreak(userId);
      setStreak(data);
    } catch (err) {
      console.error('Error refetching streak:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch streak');
    } finally {
      setLoading(false);
    }
  };

  return { streak, loading, error, refetchStreak };
};

export default useStreak;
