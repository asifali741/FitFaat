import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, ViewStyle } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import AnimatedPressable from './AnimatedPressable';

export type FilterChipOption = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

type FilterChipsProps = {
  options: FilterChipOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  colors: any;
  style?: ViewStyle;
};

export function FilterChips({ options, selectedValue, onChange, colors, style }: FilterChipsProps) {
  return (
    <ScrollView
      style={styles.scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const isActive = option.value === selectedValue;

        return (
          <AnimatedPressable
            key={option.value}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : colors.cardBackground,
                borderColor: isActive ? colors.primary : colors.cardBorder || colors.border,
              },
            ]}
            onPress={() => onChange(option.value)}
            activeScale={0.96}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={Math.min(hp(1.9), wp(4.1))}
                color={isActive ? colors.textOnPrimary : colors.textSecondary}
              />
            ) : null}
            <Text
              style={[
                styles.chipText,
                { color: isActive ? colors.textOnPrimary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {typeof option.badge === 'number' ? (
              <Text
                style={[
                  styles.badge,
                  {
                    color: isActive ? colors.primary : colors.textOnPrimary,
                    backgroundColor: isActive ? colors.textOnPrimary : colors.primary,
                  },
                ]}
              >
                {option.badge > 99 ? '99+' : option.badge}
              </Text>
            ) : null}
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: hp(6.8),
  },
  content: {
    gap: wp(2),
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.7),
  },
  chip: {
    minHeight: hp(4.2),
    borderRadius: hp(2.2),
    borderWidth: 1,
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(0.9),
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.4),
  },
  chipText: {
    fontSize: Math.min(hp(1.55), wp(3.45)),
    fontWeight: '800',
    letterSpacing: 0,
  },
  badge: {
    overflow: 'hidden',
    minWidth: hp(2.4),
    height: hp(2.4),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(1.1),
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: Math.min(hp(1.2), wp(2.7)),
    fontWeight: '900',
  },
});

export default FilterChips;
