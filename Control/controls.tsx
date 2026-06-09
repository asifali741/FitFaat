import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';
import {
  getDashboardHealthScore,
  getHydrationValue,
  getProgressValue,
  getSingleMetricProgress,
} from '@/utils/dashboardProgress';
import { getStoredDashboardCache } from '@/utils/dashboardStorage';
import { FREE_PLAN_LIMITS } from '@/utils/featureAccess';
import { DEFAULT_STEP_GOAL, WALKING_PROGRESS_STORAGE_KEY } from '@/utils/localWalkingProgress';
import { getIsPremiumUser } from '@/utils/premiumAccess';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { sendChatbotMessage, type ChatbotCoachContext } from '../utils/api';

const FREE_CHAT_DAILY_LIMIT = FREE_PLAN_LIMITS.aiCoachDailyMessages;
const FREE_CHAT_USAGE_KEY = "fitfaat_free_chat_usage_v1";

type ChatLimitState = {
  isPremium: boolean;
  canChat: boolean;
  remainingChats: number;
  dailyLimit: number;
  usedChats: number;
};

const getLocalDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildPremiumLimit = (): ChatLimitState => ({
  isPremium: true,
  canChat: true,
  remainingChats: Number.MAX_SAFE_INTEGER,
  dailyLimit: Number.MAX_SAFE_INTEGER,
  usedChats: 0,
});

const buildFreeLimit = (usedChats: number): ChatLimitState => {
  const safeUsedChats = Math.max(0, Math.min(FREE_CHAT_DAILY_LIMIT, Math.round(Number(usedChats) || 0)));

  return {
    isPremium: false,
    canChat: safeUsedChats < FREE_CHAT_DAILY_LIMIT,
    remainingChats: Math.max(0, FREE_CHAT_DAILY_LIMIT - safeUsedChats),
    dailyLimit: FREE_CHAT_DAILY_LIMIT,
    usedChats: safeUsedChats,
  };
};

const normalizeRemoteLimit = (data: any, fallback: ChatLimitState): ChatLimitState => {
  const isPremium = Boolean(data?.isPremium || fallback.isPremium);
  if (isPremium) return buildPremiumLimit();

  const remainingChats = Number(
    data?.remainingChats ?? data?.remaining ?? data?.remainingMessages ?? fallback.remainingChats
  );
  const usedChats = Number(data?.usedChats ?? data?.used ?? FREE_CHAT_DAILY_LIMIT - remainingChats);
  const nextLimit = buildFreeLimit(Number.isFinite(usedChats) ? usedChats : fallback.usedChats);

  return {
    ...nextLimit,
    remainingChats: Number.isFinite(remainingChats)
      ? Math.max(0, Math.min(FREE_CHAT_DAILY_LIMIT, Math.round(remainingChats)))
      : nextLimit.remainingChats,
    canChat: Boolean(data?.canChat ?? nextLimit.canChat),
  };
};

const getDateKeyFromValue = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const goalLabels: Record<string, string> = {
  "1": "Weight loss",
  "2": "Muscle gain",
  "3": "Weight gain",
};

const getGoalLabel = (user: any, metrics: any) => {
  const rawGoal =
    user?.userInfo?.fitnessGoal ??
    user?.fitnessGoal ??
    metrics?.fitnessGoal ??
    metrics?.selectedGoal ??
    metrics?.goal;
  const normalizedGoal = String(rawGoal || "").trim().toLowerCase();

  if (goalLabels[normalizedGoal]) return goalLabels[normalizedGoal];
  if (normalizedGoal.includes("loss")) return "Weight loss";
  if (normalizedGoal.includes("muscle")) return "Muscle gain";
  if (normalizedGoal.includes("gain")) return "Weight gain";
  return "General fitness";
};

const parseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getTodayDashboardDay = (days: any[]) => {
  const todayKey = getDateKeyFromValue();
  return (
    days.find((day) => day?.status === "active") ||
    days.find((day) => getDateKeyFromValue(day?.date) === todayKey) ||
    days.find((day) => day?.status !== "locked") ||
    days[0] ||
    null
  );
};

const getStepValues = (today: any, stepHistory: any[], isPremium: boolean) => {
  const todayKey = getDateKeyFromValue();
  const todayStepEntry = Array.isArray(stepHistory)
    ? stepHistory.find((entry) => entry?.dateKey === todayKey)
    : null;
  const achieved = Math.round(
    getProgressValue(
      today?.walkingSteps ??
        today?.steps ??
        today?.stepCount ??
        todayStepEntry?.steps
    )
  );
  const rawTarget = Math.round(
    getProgressValue(
      today?.walkingStepGoal ??
        today?.stepGoal ??
        today?.targetSteps ??
        today?.dailyStepGoal ??
        todayStepEntry?.goal
    ) || DEFAULT_STEP_GOAL
  );
  const displayedAchieved = isPremium
    ? achieved
    : Math.min(achieved, FREE_PLAN_LIMITS.dailyStepCounterPreview);
  const target = isPremium ? rawTarget : FREE_PLAN_LIMITS.dailyStepCounterPreview;

  return {
    achieved: displayedAchieved,
    target,
    progress: getSingleMetricProgress(displayedAchieved, target),
    source: todayStepEntry || achieved > 0 ? "pedometer" as const : "local history" as const,
  };
};

const buildNextBestAction = (
  caloriesProgress: number,
  hydrationProgress: number,
  stepsProgress: number
) => {
  if (hydrationProgress < 70) return "Add one water log before the next meal.";
  if (caloriesProgress < 70) return "Log the next meal with calories as accurately as possible.";
  if (stepsProgress >= 75 && stepsProgress < 100) return "Take a short walk and let the pedometer update.";
  return "Keep the next real meal, water, or step update logged.";
};

const buildChatbotCoachContext = async (
  premiumOverride?: boolean
): Promise<ChatbotCoachContext | undefined> => {
  try {
    const [rawDashboard, rawMetrics, rawStepHistory, user, premiumActive] = await Promise.all([
      getStoredDashboardCache<Record<string, any>>(),
      AsyncStorage.getItem("fitfaat_health_metrics"),
      AsyncStorage.getItem(WALKING_PROGRESS_STORAGE_KEY),
      tokenStorage.getUser(),
      premiumOverride === undefined ? getIsPremiumUser().catch(() => false) : Promise.resolve(premiumOverride),
    ]);
    const dashboard = rawDashboard?.data;
    const metrics = parseJson(rawMetrics);
    const stepHistory = parseJson(rawStepHistory) || [];
    const dashboardData = dashboard;
    const days = dashboardData && typeof dashboardData === "object"
      ? Object.values(dashboardData)
      : [];
    const today = getTodayDashboardDay(days);
    if (!today) {
      return {
        goalLabel: getGoalLabel(user, metrics),
        plan: premiumActive ? "premium" : "free",
        nextBestAction: "Log one meal or one water entry so HeaLora can personalize the next reply.",
      };
    }

    const score = getDashboardHealthScore(today, premiumActive);
    const calorieProgress = getSingleMetricProgress(today.achievedCalories, today.targetCalories);
    const hydrationProgress = getSingleMetricProgress(getHydrationValue(today), today.targetHydration);
    const steps = getStepValues(today, stepHistory, premiumActive);
    const recentLogs = days
      .filter((day: any) => day?.status !== "locked")
      .slice(-3)
      .map((day: any) => {
        const dayHydration = getHydrationValue(day);
        const daySteps = getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount);
        return `Day ${day.dayNo}: ${Math.round(getProgressValue(day.achievedCalories))} cal, ${dayHydration.toFixed(1)}L water, ${Math.round(daySteps)} steps`;
      });

    return {
      goalLabel: getGoalLabel(user, metrics),
      plan: premiumActive ? "premium" : "free",
      score: score.score,
      scoreLabel: score.modelLabel,
      scoreConfidence: score.confidenceLabel,
      streakCount: days.filter((day: any) => day?.status === "finished").length,
      recentLogs,
      calories: {
        achieved: Math.round(getProgressValue(today.achievedCalories)),
        target: Math.round(getProgressValue(today.targetCalories)),
        progress: calorieProgress,
      },
      hydration: {
        achieved: Math.round(getHydrationValue(today) * 10) / 10,
        target: Math.round(getProgressValue(today.targetHydration) * 10) / 10,
        progress: hydrationProgress,
      },
      steps,
      nextBestAction: buildNextBestAction(calorieProgress, hydrationProgress, steps.progress),
    };
  } catch (error) {
    console.warn("Unable to build chatbot coach context:", error);
    return undefined;
  }
};

type ControlsProps = {
  onAddMessage?: (text: string, isUser: boolean, source?: string) => void;
  sessionId?: string;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
};

export default function Controls({
  onAddMessage,
  sessionId,
  onInputFocus,
  onInputBlur,
}: ControlsProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatLimit, setChatLimit] = useState<ChatLimitState | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const router = useRouter();

  const API_URL = getBackendBaseUrl();

  const getLocalChatLimit = useCallback(async (premiumOverride?: boolean): Promise<ChatLimitState> => {
    const premiumActive = premiumOverride ?? await getIsPremiumUser().catch(() => false);
    if (premiumActive) return buildPremiumLimit();

    try {
      const rawUsage = await AsyncStorage.getItem(FREE_CHAT_USAGE_KEY);
      const parsedUsage = rawUsage ? JSON.parse(rawUsage) : null;
      const todayKey = getLocalDateKey();
      const usedChats = parsedUsage?.dateKey === todayKey ? Number(parsedUsage?.usedChats || 0) : 0;
      return buildFreeLimit(usedChats);
    } catch (error) {
      console.warn('Error reading local chat limit:', error);
      return buildFreeLimit(0);
    }
  }, []);

  const recordLocalFreeMessage = async (currentLimit: ChatLimitState | null) => {
    if (currentLimit?.isPremium) return;

    try {
      const todayKey = getLocalDateKey();
      const rawUsage = await AsyncStorage.getItem(FREE_CHAT_USAGE_KEY);
      const parsedUsage = rawUsage ? JSON.parse(rawUsage) : null;
      const usedChats = parsedUsage?.dateKey === todayKey ? Number(parsedUsage?.usedChats || 0) : 0;
      const nextLimit = buildFreeLimit(usedChats + 1);

      await AsyncStorage.setItem(
        FREE_CHAT_USAGE_KEY,
        JSON.stringify({
          dateKey: todayKey,
          usedChats: nextLimit.usedChats,
          updatedAt: new Date().toISOString(),
        })
      );
      setChatLimit(nextLimit);
    } catch (error) {
      console.warn('Error saving local chat limit:', error);
    }
  };

  const checkChatLimit = useCallback(async () => {
    const fallbackLimit = await getLocalChatLimit();

    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        setChatLimit(fallbackLimit);
        return fallbackLimit;
      }

      const response = await fetch(`${API_URL}/api/chatbot/check-limit`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const nextLimit = normalizeRemoteLimit(data, fallbackLimit);
      setChatLimit(nextLimit);
      return nextLimit;
    } catch (error) {
      console.warn('Error checking chat limit:', error);
      setChatLimit(fallbackLimit);
      return fallbackLimit;
    }
  }, [API_URL, getLocalChatLimit]);

  // Check chat limit on component mount and periodically
  useEffect(() => {
    checkChatLimit();
    const interval = setInterval(checkChatLimit, 30000);
    return () => clearInterval(interval);
  }, [checkChatLimit]);

  const handleSend = async () => {
    if (!content.trim()) {
      Alert.alert("Empty message", "Please type something before sending.");
      return;
    }

    const currentLimit = chatLimit || await checkChatLimit();

    if (currentLimit && !currentLimit.isPremium && !currentLimit.canChat) {
      setShowLimitModal(true);
      return;
    }
    
    const userMessage = content.trim();
    setContent(""); // Clear immediately
    
    try {
      setIsLoading(true);
      
      // Add user message directly
      if (onAddMessage) {
        try {
          onAddMessage(userMessage, true, 'user');
        } catch (err) {
          console.error('Error adding user message:', err);
        }
      }

      const coachContext = await buildChatbotCoachContext(currentLimit?.isPremium);
      const response = await sendChatbotMessage(userMessage, sessionId, coachContext);
      
      // Add AI response
      if (onAddMessage && response.aiResponse) {
        onAddMessage(response.aiResponse.content, false, response.aiResponse.source);
      }

      await recordLocalFreeMessage(currentLimit);

      // Refresh chat limit after sending message
      await checkChatLimit();
    } catch (error: any) {
      console.warn('Chat error:', error);
      
      // Check if it's a limit error
      if (error.message && error.message.includes('limit')) {
        setShowLimitModal(true);
      } else {
        Alert.alert("Error", "Failed to get response. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Show remaining chats for non-premium users */}
      {chatLimit && !chatLimit.isPremium && (
        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            {chatLimit.remainingChats} of {chatLimit.dailyLimit} free messages left today
          </Text>
          <Text style={styles.hiddenLimitText}>
            📨 {chatLimit.remainingChats} free message{chatLimit.remainingChats !== 1 ? 's' : ''} left today
          </Text>
        </View>
      )}
      
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          onChangeText={setContent}
          value={content}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          multiline={false}
          editable={!isLoading && (chatLimit?.canChat !== false)}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          style={[
            styles.sendButton, 
            (isLoading || chatLimit?.canChat === false) && { opacity: 0.5 }
          ]}
          disabled={isLoading || chatLimit?.canChat === false}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Limit Reached Modal */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Ionicons name="close-circle" size={30} color="#999" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Free Usage Limit Reached</Text>

            {/* Subtitle */}
            <Text style={styles.modalSubtitle}>
              You've sent {FREE_CHAT_DAILY_LIMIT} free messages today
            </Text>

            {/* Description */}
            <Text style={styles.modalDescription}>
              Your daily free chat limit has ended. Upgrade to Premium to enjoy unlimited conversations with HeaLora anytime!
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Unlimited daily messages</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Priority health guidance</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Full access to AI features</Text>
              </View>
            </View>

            {/* Price Tag */}
            <View style={styles.priceTag}>
              <Text style={styles.priceAmount}>$10</Text>
              <Text style={styles.priceFrequency}>/month</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.upgradButton}
              onPress={() => {
                setShowLimitModal(false);
                router.push("/(main)/(settings)/premium");
              }}
            >
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.upgradButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1.5),
    paddingBottom: Platform.OS === 'ios' ? hp(2) : hp(1.5),
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    zIndex: 10,
  },
  iconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.8),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: hp(1.8),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.8),
  },
  featuresList: {
    width: '100%',
    marginBottom: hp(2.5),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  featureText: {
    fontSize: hp(1.7),
    color: '#333',
    marginLeft: wp(2.5),
    fontWeight: '500',
  },
  priceTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: hp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    backgroundColor: '#F0F7FF',
    borderRadius: hp(1.5),
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  priceAmount: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: '#4CAF50',
  },
  priceFrequency: {
    fontSize: hp(1.9),
    color: '#666',
    marginLeft: wp(1),
    fontWeight: '600',
  },
  upgradButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: hp(2),
    borderRadius: hp(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradButtonText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: '#fff',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  laterButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    borderRadius: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  laterButtonText: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#666',
  },
  limitInfo: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    marginBottom: hp(1),
    backgroundColor: '#FFF3E0',
    borderRadius: hp(1),
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  limitText: {
    fontSize: hp(1.7),
    color: '#E65100',
    fontWeight: '600',
  },
  hiddenLimitText: {
    display: 'none',
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: hp(6),
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  input: {
    flex: 1,
    height: hp(5),
    fontSize: hp(2.2),
    paddingHorizontal: hp(1.5),
  },
  sendButton: {
    height: hp(4.7),
    width: hp(4.7),
    borderRadius: hp(2.35),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
});
