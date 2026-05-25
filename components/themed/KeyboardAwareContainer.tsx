import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
  extraScrollHeight?: number;
  extraHeight?: number;
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
  extraScrollHeight,
  extraHeight,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const keyboardExtraScrollHeight = extraScrollHeight ?? Math.max(160, keyboardVerticalOffset + 140);
  const keyboardExtraHeight = extraHeight ?? keyboardExtraScrollHeight;

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const content = scrollable ? (
    <KeyboardAwareScrollView
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={keyboardExtraScrollHeight}
      extraHeight={keyboardExtraHeight}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.inner}>{children}</View>
      </TouchableWithoutFeedback>
    </KeyboardAwareScrollView>
  ) : (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[styles.container, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {scrollable ? (
        content
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
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
