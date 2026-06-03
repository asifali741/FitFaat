import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BREATHING_HISTORY_KEY = "fitfaat_breathing_sessions";
type BreathPhaseName = "Inhale" | "Hold" | "Exhale" | "Rest";

type BreathPhase = {
  name: BreathPhaseName;
  seconds: number;
  scale: number;
  opacity: number;
};

type Technique = {
  id: string;
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: readonly [string, string, string];
  phases: BreathPhase[];
};

type SessionHistoryItem = {
  id: string;
  techniqueName: string;
  minutes: number;
  cycles: number;
  completedAt: string;
};

const techniques: Technique[] = [
  {
    id: "box",
    name: "Box Breathing",
    subtitle: "Steady focus and nervous-system reset",
    icon: "square-outline",
    color: "#0891B2",
    gradient: ["#DFF7F4", "#E0F2FE", "#FFFFFF"],
    phases: [
      { name: "Inhale", seconds: 4, scale: 1.35, opacity: 0.95 },
      { name: "Hold", seconds: 4, scale: 1.35, opacity: 0.8 },
      { name: "Exhale", seconds: 4, scale: 0.78, opacity: 0.62 },
      { name: "Rest", seconds: 4, scale: 0.78, opacity: 0.56 },
    ],
  },
  {
    id: "478",
    name: "4-7-8",
    subtitle: "Slow down before sleep or after stress",
    icon: "moon-outline",
    color: "#6366F1",
    gradient: ["#EDE9FE", "#DBEAFE", "#FFFFFF"],
    phases: [
      { name: "Inhale", seconds: 4, scale: 1.32, opacity: 0.95 },
      { name: "Hold", seconds: 7, scale: 1.32, opacity: 0.82 },
      { name: "Exhale", seconds: 8, scale: 0.72, opacity: 0.56 },
    ],
  },
  {
    id: "wim-hof",
    name: "Wim Hof",
    subtitle: "Energizing breath rhythm for a quick lift",
    icon: "flash-outline",
    color: "#10B981",
    gradient: ["#D1FAE5", "#CCFBF1", "#FFFFFF"],
    phases: [
      { name: "Inhale", seconds: 2, scale: 1.38, opacity: 0.96 },
      { name: "Exhale", seconds: 2, scale: 0.76, opacity: 0.58 },
    ],
  },
];

const phaseCopy: Record<BreathPhaseName, string> = {
  Inhale: "Breathe in through the nose",
  Hold: "Hold gently, shoulders soft",
  Exhale: "Release slowly and completely",
  Rest: "Stay relaxed before the next breath",
};

const formatSessionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getInitialDurations = (technique: Technique) =>
  technique.phases.map((phase) => phase.seconds);

export default function MindfulnessScreen() {
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTechniqueId, setSelectedTechniqueId] = useState(techniques[0].id);
  const [phaseDurations, setPhaseDurations] = useState(getInitialDurations(techniques[0]));
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(techniques[0].phases[0].seconds);
  const [sessionMinutes, setSessionMinutes] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [customMinuteInput, setCustomMinuteInput] = useState("3");
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [mindfulnessAccess, setMindfulnessAccess] = useState<FeatureAccessStatus | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didSaveCurrentSession = useRef(false);
  const breathScale = useSharedValue(0.82);
  const breathOpacity = useSharedValue(0.68);

  const selectedTechnique = useMemo(
    () => techniques.find((technique) => technique.id === selectedTechniqueId) || techniques[0],
    [selectedTechniqueId]
  );
  const visibleTechniques = techniques;

  const currentPhase = selectedTechnique.phases[phaseIndex] || selectedTechnique.phases[0];
  const sessionTotalSeconds = sessionMinutes * 60;
  const sessionProgress = sessionTotalSeconds > 0 ? Math.min(elapsedSeconds / sessionTotalSeconds, 1) : 0;
  const phaseProgress = currentPhase
    ? 1 - remainingSeconds / Math.max(phaseDurations[phaseIndex] || currentPhase.seconds, 1)
    : 0;
  const activeGradient = useMemo(() => {
    if (isDarkMode) {
      if (currentPhase.name === "Inhale") return ["#083344", "#0F172A", "#020617"] as const;
      if (currentPhase.name === "Hold") return ["#1E1B4B", "#0F172A", "#020617"] as const;
      if (currentPhase.name === "Exhale") return ["#064E3B", "#0F172A", "#020617"] as const;
      return ["#111827", "#0F172A", "#020617"] as const;
    }

    if (currentPhase.name === "Inhale") return selectedTechnique.gradient;
    if (currentPhase.name === "Hold") return ["#F8FAFC", selectedTechnique.gradient[1], "#FFFFFF"] as const;
    if (currentPhase.name === "Exhale") return ["#F1F5F9", "#E0F2FE", "#FFFFFF"] as const;
    return ["#F8FAFC", "#F1F5F9", "#FFFFFF"] as const;
  }, [currentPhase.name, isDarkMode, selectedTechnique.gradient]);

  const styles = useMemo(() => getStyles(colors, insets.bottom, isDarkMode), [colors, insets.bottom, isDarkMode]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: breathOpacity.value,
    transform: [{ scale: breathScale.value }],
  }));

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(BREATHING_HISTORY_KEY);
        const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
        setSessionHistory(Array.isArray(parsedHistory) ? parsedHistory.slice(0, 12) : []);
      } catch (error) {
        console.log("[Mindfulness] Unable to load breathing history:", error);
      }
    };

    loadHistory();
  }, []);

  const loadAccessState = useCallback(async () => {
    setIsAccessLoading(true);

    try {
      const featureAccess = await getFeatureAccessStatus("mindfulnessPro");
      setMindfulnessAccess(featureAccess);
    } catch (error) {
      console.log("[Mindfulness] Failed to check mindfulness access:", error);
      setMindfulnessAccess(null);
    } finally {
      setIsAccessLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccessState();
    }, [loadAccessState])
  );

  useEffect(() => {
    breathScale.value = withTiming(currentPhase.scale, {
      duration: Math.max((phaseDurations[phaseIndex] || currentPhase.seconds) * 1000, 350),
      easing: Easing.inOut(Easing.cubic),
    });
    breathOpacity.value = withTiming(currentPhase.opacity, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    if (isRunning) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [breathOpacity, breathScale, currentPhase, isRunning, phaseDurations, phaseIndex]);

  const persistHistory = useCallback(async (nextHistory: SessionHistoryItem[]) => {
    setSessionHistory(nextHistory);
    await AsyncStorage.setItem(BREATHING_HISTORY_KEY, JSON.stringify(nextHistory));
  }, []);

  const finishSession = useCallback(async (finalElapsedSeconds = elapsedSeconds) => {
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (finalElapsedSeconds < 15) return;

    const historyItem: SessionHistoryItem = {
      id: `${Date.now()}-${selectedTechnique.id}`,
      techniqueName: selectedTechnique.name,
      minutes: Math.max(1, Math.round(finalElapsedSeconds / 60)),
      cycles: completedCycles,
      completedAt: new Date().toISOString(),
    };

    try {
      await persistHistory([historyItem, ...sessionHistory].slice(0, 12));
    } catch (error) {
      console.log("[Mindfulness] Unable to save breathing history:", error);
    }
  }, [
    completedCycles,
    elapsedSeconds,
    persistHistory,
    selectedTechnique.id,
    selectedTechnique.name,
    sessionHistory,
  ]);

  useEffect(() => {
    if (!isRunning) return;

    timeoutRef.current = setTimeout(() => {
      setElapsedSeconds((value) => {
        const nextValue = value + 1;
        if (nextValue >= sessionTotalSeconds && !didSaveCurrentSession.current) {
          didSaveCurrentSession.current = true;
          finishSession(nextValue);
        }
        return Math.min(nextValue, sessionTotalSeconds);
      });

      setRemainingSeconds((seconds) => {
        if (seconds > 1) return seconds - 1;

        const nextIndex = (phaseIndex + 1) % selectedTechnique.phases.length;
        if (nextIndex === 0) {
          setCompletedCycles((value) => value + 1);
        }
        setPhaseIndex(nextIndex);
        return phaseDurations[nextIndex] || selectedTechnique.phases[nextIndex].seconds;
      });
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [finishSession, isRunning, phaseDurations, phaseIndex, selectedTechnique.phases, sessionTotalSeconds]);

  const resetSession = (technique = selectedTechnique, durations = phaseDurations) => {
    setIsRunning(false);
    setPhaseIndex(0);
    setRemainingSeconds(durations[0] || technique.phases[0].seconds);
    setElapsedSeconds(0);
    setCompletedCycles(0);
    didSaveCurrentSession.current = false;
    breathScale.value = withTiming(0.82, { duration: 250 });
    breathOpacity.value = withTiming(0.68, { duration: 250 });
  };

  const handleTechniqueSelect = (technique: Technique) => {
    const nextDurations = getInitialDurations(technique);
    setSelectedTechniqueId(technique.id);
    setPhaseDurations(nextDurations);
    resetSession(technique, nextDurations);
  };

  const handleStartPause = () => {
    if (!isRunning) {
      didSaveCurrentSession.current = false;
      Haptics.selectionAsync().catch(() => {});
    }
    setIsRunning((value) => !value);
  };

  const handleDurationChange = (index: number, delta: number) => {
    const nextDurations = phaseDurations.map((duration, durationIndex) =>
      durationIndex === index ? Math.max(1, Math.min(20, duration + delta)) : duration
    );
    setPhaseDurations(nextDurations);
    if (index === phaseIndex) {
      setRemainingSeconds(nextDurations[index]);
    }
    resetSession(selectedTechnique, nextDurations);
  };

  const handleSessionMinutesChange = (delta: number) => {
    const nextMinutes = Math.max(1, Math.min(20, sessionMinutes + delta));
    setSessionMinutes(nextMinutes);
    setCustomMinuteInput(String(nextMinutes));
    resetSession();
  };

  const handleMinuteInputBlur = () => {
    const parsedMinutes = Number(customMinuteInput);
    const nextMinutes = Number.isFinite(parsedMinutes)
      ? Math.max(1, Math.min(20, Math.round(parsedMinutes)))
      : sessionMinutes;
    setSessionMinutes(nextMinutes);
    setCustomMinuteInput(String(nextMinutes));
    resetSession();
  };

  const clearHistory = async () => {
    await persistHistory([]);
  };

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(main)/(settings)" as any);
        return true;
      });

      return () => subscription.remove();
    }, [router])
  );

  const statusBarBackground = isDarkMode ? "#0F172A" : activeGradient[0];

  return (
    <LinearGradient colors={activeGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={statusBarBackground}
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={Math.min(hp(3), wp(6.5))} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Mindfulness</Text>
            <Text style={styles.title}>Breathing Room</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowHistory(true)}
            accessibilityRole="button"
            accessibilityLabel="Open breathing history"
          >
            <Ionicons
              name="time-outline"
              size={Math.min(hp(2.8), wp(6))}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isAccessLoading ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading mindfulness</Text>
            </View>
          ) : (
            <>
          <FeatureLimitBanner access={mindfulnessAccess} />

          <View style={styles.techniqueRow}>
            {visibleTechniques.map((technique) => {
              const active = technique.id === selectedTechnique.id;
              return (
                <TouchableOpacity
                  key={technique.id}
                  style={[
                    styles.techniqueChip,
                    active && {
                      borderColor: technique.color,
                      backgroundColor: `${technique.color}18`,
                    },
                  ]}
                  onPress={() => handleTechniqueSelect(technique)}
                  activeOpacity={0.82}
                >
                  <Ionicons
                    name={technique.icon}
                    size={Math.min(hp(2.2), wp(4.8))}
                    color={active ? technique.color : colors.textSecondary}
                  />
                  <Text style={[styles.techniqueText, active && { color: technique.color }]}>
                    {technique.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.breathStage}>
            <View style={[styles.orbit, { borderColor: `${selectedTechnique.color}24` }]}>
              <Animated.View
                style={[
                  styles.breathCircle,
                  {
                    backgroundColor: selectedTechnique.color,
                    shadowColor: selectedTechnique.color,
                  },
                  circleStyle,
                ]}
              />
              <View style={styles.phaseTextWrap}>
                <Text style={[styles.phaseName, { color: selectedTechnique.color }]}>
                  {currentPhase.name}
                </Text>
                <Text style={styles.phaseTimer}>{remainingSeconds}</Text>
                <Text style={styles.phaseCopy}>{phaseCopy[currentPhase.name]}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sessionPanel}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.panelLabel}>Session</Text>
                <Text style={styles.panelTitle}>
                  {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} / {sessionMinutes}:00
                </Text>
              </View>
              <View style={styles.cyclePill}>
                <Ionicons name="repeat-outline" size={Math.min(hp(1.9), wp(4.2))} color={selectedTechnique.color} />
                <Text style={[styles.cycleText, { color: selectedTechnique.color }]}>
                  {completedCycles} cycles
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${sessionProgress * 100}%`,
                    backgroundColor: selectedTechnique.color,
                  },
                ]}
              />
            </View>
            <View style={styles.phaseTrack}>
              <View
                style={[
                  styles.phaseFill,
                  {
                    width: `${Math.max(phaseProgress * 100, 4)}%`,
                    backgroundColor: `${selectedTechnique.color}99`,
                  },
                ]}
              />
            </View>

            <View style={styles.mainControls}>
              <TouchableOpacity
                style={[styles.secondaryControl, { borderColor: `${selectedTechnique.color}35` }]}
                onPress={() => resetSession()}
                activeOpacity={0.82}
              >
                <Ionicons name="refresh" size={Math.min(hp(2.5), wp(5.5))} color={selectedTechnique.color} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryControl, { backgroundColor: selectedTechnique.color }]}
                onPress={handleStartPause}
                activeOpacity={0.86}
              >
                <Ionicons
                  name={isRunning ? "pause" : "play"}
                  size={Math.min(hp(3.1), wp(6.8))}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryControlText}>{isRunning ? "Pause" : "Start"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingsPanel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.panelLabel}>Customize</Text>
                <Text style={styles.sectionTitle}>{selectedTechnique.name}</Text>
              </View>
              <Text style={[styles.sectionMeta, { color: selectedTechnique.color }]}>
                {selectedTechnique.subtitle}
              </Text>
            </View>

            <View style={styles.minutesRow}>
              <Text style={styles.durationLabel}>Session length</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepButton} onPress={() => handleSessionMinutesChange(-1)}>
                  <Ionicons name="remove" size={Math.min(hp(2), wp(4.5))} color={colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.minuteInput}
                  value={customMinuteInput}
                  onChangeText={setCustomMinuteInput}
                  onBlur={handleMinuteInputBlur}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.minuteUnit}>min</Text>
                <TouchableOpacity style={styles.stepButton} onPress={() => handleSessionMinutesChange(1)}>
                  <Ionicons name="add" size={Math.min(hp(2), wp(4.5))} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedTechnique.phases.map((phase, index) => (
              <View key={`${phase.name}-${index}`} style={styles.phaseSettingRow}>
                <View style={styles.phaseSettingCopy}>
                  <Text style={styles.durationLabel}>{phase.name}</Text>
                  <Text style={styles.durationHint}>{phaseCopy[phase.name]}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepButton} onPress={() => handleDurationChange(index, -1)}>
                    <Ionicons name="remove" size={Math.min(hp(2), wp(4.5))} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.durationValue}>{phaseDurations[index]}s</Text>
                  <TouchableOpacity style={styles.stepButton} onPress={() => handleDurationChange(index, 1)}>
                    <Ionicons name="add" size={Math.min(hp(2), wp(4.5))} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
            </>
          )}
        </ScrollView>

        <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.historySheet}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>Session History</Text>
                  <Text style={styles.historySubtitle}>Stored locally on this device</Text>
                </View>
                <TouchableOpacity style={styles.historyClose} onPress={() => setShowHistory(false)}>
                  <Ionicons name="close" size={Math.min(hp(2.8), wp(6))} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {sessionHistory.length > 0 ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyList}>
                  {sessionHistory.map((item) => (
                    <View key={item.id} style={styles.historyItem}>
                      <View style={[styles.historyIcon, { backgroundColor: `${selectedTechnique.color}14` }]}>
                        <Ionicons name="leaf-outline" size={Math.min(hp(2.3), wp(5.1))} color={selectedTechnique.color} />
                      </View>
                      <View style={styles.historyCopy}>
                        <Text style={styles.historyTechnique}>{item.techniqueName}</Text>
                        <Text style={styles.historyMeta}>
                          {item.minutes} min | {item.cycles} cycles | {formatSessionDate(item.completedAt)}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.clearHistoryButton} onPress={clearHistory}>
                    <Text style={styles.clearHistoryText}>Clear History</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <View style={styles.emptyHistory}>
                  <Ionicons name="leaf-outline" size={Math.min(hp(5), wp(11))} color={colors.textSecondary} />
                  <Text style={styles.emptyHistoryTitle}>No sessions yet</Text>
                  <Text style={styles.emptyHistoryText}>
                    Complete a breathing session and it will appear here.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (colors: any, bottomInset: number, isDarkMode: boolean) => {
  const glassBackground = isDarkMode ? "rgba(30, 41, 59, 0.84)" : "rgba(255, 255, 255, 0.78)";
  const glassStrong = isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.88)";
  const glassSoft = isDarkMode ? "rgba(30, 41, 59, 0.72)" : "rgba(255, 255, 255, 0.72)";
  const glassBorder = isDarkMode ? "rgba(148, 163, 184, 0.24)" : "rgba(255, 255, 255, 0.95)";
  const subtleTrack = isDarkMode ? "rgba(148, 163, 184, 0.24)" : "rgba(148, 163, 184, 0.22)";

  return StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: hp(7.4),
    paddingHorizontal: wp(4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: Math.min(hp(5), wp(11)),
    height: Math.min(hp(5), wp(11)),
    borderRadius: Math.min(hp(2.5), wp(5.5)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassBackground,
    borderWidth: 1,
    borderColor: glassBorder,
  },
  headerCopy: {
    alignItems: "center",
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.8)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.3)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: bottomInset + hp(12),
  },
  loadingPanel: {
    minHeight: hp(34),
    borderRadius: hp(2),
    backgroundColor: glassBackground,
    borderWidth: 1,
    borderColor: glassBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: hp(1.2),
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.35)),
    fontWeight: "800",
  },
  lockedPanel: {
    marginTop: hp(1),
  },
  techniqueRow: {
    flexDirection: "row",
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  techniqueChip: {
    flex: 1,
    minHeight: hp(7.2),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: glassBackground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(1),
    gap: hp(0.45),
  },
  techniqueText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: "900",
    textAlign: "center",
  },
  breathStage: {
    minHeight: hp(34),
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    width: Math.min(wp(74), hp(34)),
    height: Math.min(wp(74), hp(34)),
    borderRadius: Math.min(wp(37), hp(17)),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.36)" : "rgba(255, 255, 255, 0.32)",
  },
  breathCircle: {
    position: "absolute",
    width: "58%",
    height: "58%",
    borderRadius: 999,
    shadowOffset: { width: 0, height: hp(1) },
    shadowOpacity: 0.22,
    shadowRadius: wp(8),
    elevation: 10,
  },
  phaseTextWrap: {
    width: "72%",
    minHeight: hp(13),
    borderRadius: hp(2),
    backgroundColor: glassStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(4),
  },
  phaseName: {
    fontSize: Math.min(hp(2.6), wp(6)),
    fontWeight: "900",
  },
  phaseTimer: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(6.2), wp(14)),
    fontWeight: "900",
    lineHeight: Math.min(hp(6.8), wp(15)),
    marginTop: hp(0.2),
  },
  phaseCopy: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "800",
    textAlign: "center",
  },
  sessionPanel: {
    borderRadius: hp(2),
    backgroundColor: glassBackground,
    borderWidth: 1,
    borderColor: glassBorder,
    padding: wp(4),
    marginTop: hp(1),
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
  },
  panelLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.14), wp(2.7)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.15), wp(4.85)),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  cyclePill: {
    minHeight: hp(3.7),
    borderRadius: hp(1.85),
    paddingHorizontal: wp(2.6),
    backgroundColor: glassStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.1),
  },
  cycleText: {
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: "900",
  },
  progressTrack: {
    height: hp(1.1),
    borderRadius: hp(0.55),
    backgroundColor: subtleTrack,
    overflow: "hidden",
    marginTop: hp(1.6),
  },
  progressFill: {
    height: "100%",
    borderRadius: hp(0.55),
  },
  phaseTrack: {
    height: hp(0.65),
    borderRadius: hp(0.35),
    backgroundColor: isDarkMode ? "rgba(148, 163, 184, 0.18)" : "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
    marginTop: hp(0.8),
  },
  phaseFill: {
    height: "100%",
    borderRadius: hp(0.35),
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(3),
    marginTop: hp(2),
  },
  secondaryControl: {
    width: Math.min(hp(6), wp(13)),
    height: Math.min(hp(6), wp(13)),
    borderRadius: Math.min(hp(3), wp(6.5)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassStrong,
    borderWidth: 1,
  },
  primaryControl: {
    minHeight: hp(6),
    borderRadius: hp(3),
    paddingHorizontal: wp(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(2),
  },
  primaryControlText: {
    color: "#FFFFFF",
    fontSize: Math.min(hp(1.85), wp(4.2)),
    fontWeight: "900",
  },
  settingsPanel: {
    borderRadius: hp(2),
    backgroundColor: glassBackground,
    borderWidth: 1,
    borderColor: glassBorder,
    padding: wp(4),
    marginTop: hp(1.5),
  },
  sectionHeader: {
    gap: hp(0.7),
    marginBottom: hp(1.5),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  sectionMeta: {
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: "800",
    lineHeight: hp(1.9),
  },
  minutesRow: {
    minHeight: hp(6.4),
    borderRadius: hp(1.4),
    backgroundColor: glassSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    paddingHorizontal: wp(3),
    marginBottom: hp(1),
  },
  phaseSettingRow: {
    minHeight: hp(7.2),
    borderRadius: hp(1.4),
    backgroundColor: glassSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    marginTop: hp(0.9),
  },
  phaseSettingCopy: {
    flex: 1,
    minWidth: 0,
  },
  durationLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.45), wp(3.35)),
    fontWeight: "900",
  },
  durationHint: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: "700",
    marginTop: hp(0.2),
  },
  stepper: {
    minHeight: hp(4.3),
    borderRadius: hp(2.15),
    backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.7)" : "rgba(241, 245, 249, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(1),
  },
  stepButton: {
    width: Math.min(hp(3.6), wp(7.8)),
    height: Math.min(hp(3.6), wp(7.8)),
    borderRadius: Math.min(hp(1.8), wp(3.9)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassStrong,
  },
  durationValue: {
    minWidth: wp(10),
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "900",
  },
  minuteInput: {
    minWidth: wp(8.5),
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.45), wp(3.35)),
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: wp(1),
  },
  minuteUnit: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.1), wp(2.6)),
    fontWeight: "800",
    marginRight: wp(1),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  historySheet: {
    maxHeight: "78%",
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: hp(2.5),
    borderTopRightRadius: hp(2.5),
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: bottomInset + hp(2.5),
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  historyTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.2)),
    fontWeight: "900",
  },
  historySubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: "700",
    marginTop: hp(0.2),
  },
  historyClose: {
    width: hp(4.7),
    height: hp(4.7),
    borderRadius: hp(2.35),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: {
    gap: hp(1),
    paddingBottom: hp(2),
  },
  historyItem: {
    minHeight: hp(7.4),
    borderRadius: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  historyIcon: {
    width: Math.min(hp(4.7), wp(10.4)),
    height: Math.min(hp(4.7), wp(10.4)),
    borderRadius: Math.min(hp(2.35), wp(5.2)),
    alignItems: "center",
    justifyContent: "center",
  },
  historyCopy: {
    flex: 1,
    minWidth: 0,
  },
  historyTechnique: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.55)),
    fontWeight: "900",
  },
  historyMeta: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.75)),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  clearHistoryButton: {
    minHeight: hp(4.8),
    borderRadius: hp(1.5),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.error + "35",
    backgroundColor: colors.error + "10",
    marginTop: hp(0.6),
  },
  clearHistoryText: {
    color: colors.error,
    fontSize: Math.min(hp(1.45), wp(3.35)),
    fontWeight: "900",
  },
  emptyHistory: {
    minHeight: hp(28),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(8),
  },
  emptyHistoryTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "900",
    marginTop: hp(1.2),
  },
  emptyHistoryText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "700",
    lineHeight: hp(2),
    textAlign: "center",
    marginTop: hp(0.5),
  },
  });
};
