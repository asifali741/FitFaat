import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

interface ThemedCardProps extends ViewProps {
  padding?: keyof typeof theme.spacing;
  elevation?: 'small' | 'medium' | 'large';
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  padding = 'lg',
  elevation = 'medium',
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const cardStyle: ViewStyle[] = [
    styles.card,
    { padding: theme.spacing[padding] },
    theme.shadows[elevation],
  ];

  return (
    <View style={[cardStyle, style]} {...props}>
      {children}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
