import { colorsSheet } from '@/app/(main)/(settings)/_ui_elements';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (onComplete) {
          onComplete();
        }
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timerText}>
        {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colorsSheet.primary,
    fontFamily: 'monospace',
  },
});
