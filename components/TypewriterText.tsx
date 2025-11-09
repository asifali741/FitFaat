import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

type TypewriterTextProps = {
  text: string;
  speed?: number;
  style?: any;
  onComplete?: () => void;
  onTextUpdate?: () => void;
};

export default function TypewriterText({ 
  text, 
  speed = 30, 
  style, 
  onComplete,
  onTextUpdate 
}: TypewriterTextProps) {
  const [visibleText, setVisibleText] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset when text changes
    setVisibleText('');
    indexRef.current = 0;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const animateText = () => {
      if (indexRef.current < text.length) {
        setVisibleText(prev => {
          const newText = prev + text.charAt(indexRef.current);
          indexRef.current++;
          
          // Notify parent of text update for scrolling
          if (onTextUpdate) {
            onTextUpdate();
          }
          
          return newText;
        });

        timeoutRef.current = setTimeout(animateText, speed);
      } else {
        // Animation complete
        if (onComplete) {
          onComplete();
        }
      }
    };

    // Start animation
    timeoutRef.current = setTimeout(animateText, speed);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, onComplete, onTextUpdate]);

  return (
    <Text style={[styles.text, style]}>
      {visibleText}
      {indexRef.current < text.length && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: hp(1.8),
    lineHeight: hp(2.5),
  },
  cursor: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});