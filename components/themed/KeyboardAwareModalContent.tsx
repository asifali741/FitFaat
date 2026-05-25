import React from "react";
import { Keyboard, TouchableWithoutFeedback, View, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type KeyboardAwareModalContentProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  extraScrollHeight?: number;
  extraHeight?: number;
  showsVerticalScrollIndicator?: boolean;
};

export const KeyboardAwareModalContent: React.FC<KeyboardAwareModalContentProps> = ({
  children,
  style,
  contentContainerStyle,
  extraScrollHeight = 180,
  extraHeight = extraScrollHeight,
  showsVerticalScrollIndicator = false,
}) => (
  <KeyboardAwareScrollView
    style={style}
    contentContainerStyle={contentContainerStyle}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="interactive"
    showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    enableOnAndroid
    enableAutomaticScroll
    extraScrollHeight={extraScrollHeight}
    extraHeight={extraHeight}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View>{children}</View>
    </TouchableWithoutFeedback>
  </KeyboardAwareScrollView>
);
