# How to Use Light/Dark Theme in FitFaat

## 🎨 For Users

### How to Switch Themes:

1. **Open the app** and log in
2. **Navigate to Settings** (use the drawer menu or settings icon)
3. **Scroll to "Preferences" section**
4. **Find "Dark Mode" toggle**
5. **Tap the switch** to toggle between light and dark mode

The theme will change **instantly** across all screens!

### Where Does It Work?

✅ **Authentication Screens** (NEW!)
- Welcome/Landing screen
- Login screen
- Signup screen

✅ **Dashboard**
- All day views
- Diet plans
- Progress tracking

✅ **Exercises**
- Workout browser
- Exercise details
- Favorites

✅ **Chatbot**
- Chat interface
- Chat history

✅ **Settings**
- Main settings page
- Profile information

### Theme Persistence:
Your theme choice is **automatically saved** and will be remembered next time you open the app!

---

## 👨‍💻 For Developers

### Already Implemented:
The app has a fully functional `ThemeContext` located at:
```
contexts/ThemeContext.tsx
```

### Theme Colors Available:

#### Primary Colors:
- `colors.primary` - Main brand green
- `colors.primaryLight` - Light green
- `colors.primaryDark` - Dark green
- `colors.primarySoft` - Soft background green

#### Text Colors:
- `colors.textPrimary` - Main text
- `colors.textSecondary` - Secondary text
- `colors.textLight` - Light text
- `colors.textOnPrimary` - Text on primary backgrounds
- `colors.textOnCard` - Text on cards

#### Background Colors:
- `colors.background` - Main app background
- `colors.screenColor` - Screen background
- `colors.cardBackground` - Card background
- `colors.cardBorder` - Card borders

#### Status Colors:
- `colors.success` - Success states
- `colors.error` - Error states
- `colors.warning` - Warning states
- `colors.info` - Info states

### How to Add Theme Support to a New Screen:

#### Step 1: Import useTheme
```typescript
import { useTheme } from '@/contexts/ThemeContext';
```

#### Step 2: Use the Hook
```typescript
export default function MyScreen() {
  const { colors, isDarkMode } = useTheme();
  
  // ... rest of your code
}
```

#### Step 3: Convert Styles
```typescript
// OLD WAY (hardcoded):
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
});

// NEW WAY (theme-aware):
const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    backgroundColor: colors.screenColor,
    color: colors.textPrimary,
  },
});
```

#### Step 4: Apply Styles in Component
```typescript
export default function MyScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
    </View>
  );
}
```

#### Step 5: Use isDarkMode for Conditional Styling
```typescript
const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    // Use isDarkMode for specific dark/light variations
    backgroundColor: isDarkMode ? '#081C17' : '#E8F5E8',
  },
  text: {
    // Or use colors from theme
    color: colors.textPrimary,
  },
});
```

### Example: Complete Implementation

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function MyScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Screen</Text>
      <Text style={styles.subtitle}>This adapts to the theme!</Text>
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
```

### Tips:
1. **Always use `colors` from theme** instead of hardcoded colors
2. **Use `isDarkMode`** for specific dark/light variations (like gradients)
3. **Test both themes** to ensure readability
4. **Keep existing functionality** - only change visual styling

### Screens Still Needing Theme Support:
See `THEME_IMPLEMENTATION_STATUS.md` for the list of screens that still need updates.

---

## 📱 Visual Preview

### Dark Mode (Futuristic):
- Deep green/teal backgrounds with subtle gradients
- Bright mint-colored text for high contrast
- Neon green accents and borders
- Perfect for low-light environments

### Light Mode (Clean):
- Light green backgrounds with soft gradients  
- Dark text for easy reading
- Medium green accents
- Perfect for bright environments

---

## 🎯 Benefits

### For Users:
✅ Choose your preferred visual style
✅ Better readability in different lighting
✅ Reduced eye strain in dark environments
✅ Personalized app experience

### For Developers:
✅ Centralized color management
✅ Easy to maintain and update
✅ Consistent styling across the app
✅ No hardcoded colors in components

---

## 🐛 Troubleshooting

**Theme not changing?**
- Make sure you're on a screen that has theme support
- Check `THEME_IMPLEMENTATION_STATUS.md` for supported screens

**Colors look wrong?**
- Verify you're using `colors` from `useTheme()` hook
- Check if you're using `isDarkMode` for conditional colors

**Want to add theme to a new screen?**
- Follow the "For Developers" guide above
- Test in both light and dark modes
- Ensure all text is readable in both themes

---

**Need Help?** Check the implementation in:
- `app/(auth)/index.tsx` - Welcome screen example
- `components/authentication/Login.tsx` - Login screen example
- `contexts/ThemeContext.tsx` - Theme definition
