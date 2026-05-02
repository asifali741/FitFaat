import { theme } from '@/constants/theme';
import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
}

/**
 * Keyboard-aware container that ensures inputs are never hidden behind keyboard
 * Automatically scrolls focused inputs into view
 */
export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
}) => {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const content = scrollable ? (
    <ScrollView
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.inner}>{children}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  ) : (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[styles.container, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
