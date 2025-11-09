import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTheme } from '@/contexts/ThemeContext';
import { healthQAData, getShuffledQuestions, HealthQA } from '@/data/healthQA';

type QuickAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  query: string;
  color: string;
};

const quickActions: QuickAction[] = [
  { id: '1', icon: 'fitness', label: 'Workout Tips', query: 'workout', color: '#FF6B6B' },
  { id: '2', icon: 'nutrition', label: 'Diet Plan', query: 'diet', color: '#4ECDC4' },
  { id: '3', icon: 'water', label: 'Hydration', query: 'hydration', color: '#45B7D1' },
  { id: '4', icon: 'bed', label: 'Sleep Health', query: 'sleep', color: '#96CEB4' },
  { id: '5', icon: 'heart', label: 'Heart Health', query: 'heart', color: '#F06292' },
  { id: '6', icon: 'medical', label: 'Symptoms Check', query: 'symptoms', color: '#9575CD' },
];

type Props = {
  onActionPress: (question: string, answer: string) => void;
};

export default function QuickActions({ onActionPress }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [categoryQueues, setCategoryQueues] = useState<Record<string, HealthQA[]>>({});
  const [usedQuestions, setUsedQuestions] = useState<Record<string, Set<number>>>({});

  // Initialize shuffled questions for each category
  useEffect(() => {
    const initialQueues: Record<string, HealthQA[]> = {};
    const initialUsed: Record<string, Set<number>> = {};
    
    quickActions.forEach(action => {
      initialQueues[action.query] = getShuffledQuestions(action.query);
      initialUsed[action.query] = new Set();
    });
    
    setCategoryQueues(initialQueues);
    setUsedQuestions(initialUsed);
  }, []);

  const handleActionClick = (category: string) => {
    const queue = categoryQueues[category] || [];
    const used = usedQuestions[category] || new Set();
    
    if (queue.length === 0) return;
    
    // Find next unused question
    let questionIndex = -1;
    for (let i = 0; i < queue.length; i++) {
      if (!used.has(i)) {
        questionIndex = i;
        break;
      }
    }
    
    // If all questions used, reset and reshuffle
    if (questionIndex === -1) {
      const reshuffled = getShuffledQuestions(category);
      setCategoryQueues(prev => ({ ...prev, [category]: reshuffled }));
      setUsedQuestions(prev => ({ ...prev, [category]: new Set([0]) }));
      onActionPress(reshuffled[0].question, reshuffled[0].answer);
    } else {
      // Mark question as used and send it
      const newUsed = new Set(used);
      newUsed.add(questionIndex);
      setUsedQuestions(prev => ({ ...prev, [category]: newUsed }));
      onActionPress(queue[questionIndex].question, queue[questionIndex].answer);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Health Actions</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionCard, { borderColor: action.color + '40' }]}
            onPress={() => handleActionClick(action.query)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    marginVertical: hp(1),
  },
  title: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: wp(4),
    marginBottom: hp(1),
  },
  scrollContent: {
    paddingHorizontal: wp(4),
  },
  actionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.5),
    padding: hp(1.5),
    marginRight: wp(3),
    alignItems: 'center',
    width: wp(25),
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  actionLabel: {
    fontSize: hp(1.3),
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
});