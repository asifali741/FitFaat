import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

interface IncomingCallModalProps {
  visible: boolean;
  callerName: string;
  callerRole: 'user' | 'doctor';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  visible,
  callerName,
  callerRole,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Pulsing animation for the call icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulseAnim, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Caller Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons
              name={callerRole === 'doctor' ? 'medical' : 'person'}
              size={Math.min(hp(7.4), wp(16))}
              color={theme.colors.surface}
            />
          </Animated.View>

          {/* Caller Info */}
          <Text style={styles.title}>Incoming Video Call</Text>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callerRole}>
            {callerRole === 'doctor' ? 'Doctor' : 'Patient'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Reject Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={32} color={theme.colors.surface} />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={32} color={theme.colors.surface} />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    width: '85%',
    maxWidth: wp(92),
    ...theme.shadows.large,
  },
  iconContainer: {
    width: Math.min(hp(14.8), wp(32)),
    height: Math.min(hp(14.8), wp(32)),
    borderRadius: Math.min(hp(7.4), wp(16)),
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  callerName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  callerRole: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxl,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.xs,
  },
  rejectButton: {
    backgroundColor: theme.colors.error,
  },
  acceptButton: {
    backgroundColor: theme.colors.success,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
});
