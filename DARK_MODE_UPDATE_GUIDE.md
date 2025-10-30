# Dark Mode Update Guide

## ✅ Completed Screens (11/27)

### Dashboard (3/3) ✅
- ✅ Day.tsx
- ✅ DetailsDay.tsx
- ✅ index.tsx (DayPlan)

### Exercises (4/4) ✅
- ✅ workout.tsx
- ✅ favorites.tsx
- ✅ [bodypart].tsx
- ✅ exercise-details.tsx

### Chatbot (2/3) ✅
- ✅ index.tsx (landing)
- ✅ baat.tsx (main chat)
- ❌ chat-history.tsx

### Conference (1/8) ✅
- ✅ index.tsx (landing)
- ❌ doctors-list.tsx
- ❌ doctor-details.tsx
- ❌ schedule-appointment.tsx
- ❌ select-date.tsx
- ❌ booking-confirmation.tsx
- ❌ appointment-details.tsx
- ❌ appointment-summary.tsx

### Settings (1/6) ✅
- ✅ index.tsx (main)
- ❌ change-password.tsx
- ❌ edit-profile-picture.tsx
- ❌ profile-information.tsx
- ❌ payment-methods.tsx
- ❌ privacy-security.tsx

### Doctor Portal (0/2) ❌
- ❌ register.tsx
- ❌ application-status.tsx

### Auth (0/4) ❌
- ❌ index.tsx
- ❌ email-login.tsx
- ❌ email-signup.tsx
- ❌ _layout.tsx

### Components ✅
- ✅ AppHeader.tsx

---

## 📋 Remaining Files to Update (16 files)

### Pattern to Follow for Each File:

1. **Replace import:**
```typescript
// OLD:
import { colorsSheet } from "../(settings)/ui_elements";

// NEW:
import { useTheme } from "@/contexts/ThemeContext";
```

2. **Add useTheme hook in component:**
```typescript
export default function ComponentName() {
  const { colors } = useTheme();
  // ... rest of code
```

3. **Convert styles to function:**
```typescript
// OLD:
const styles = StyleSheet.create({
  container: {
    backgroundColor: colorsSheet.primary,
  },
});

// NEW:
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
  },
});
```

4. **Call getStyles in component:**
```typescript
export default function ComponentName() {
  const { colors } = useTheme();
  // ... other hooks
  
  const styles = getStyles(colors);
  
  return (
    // ... JSX
  );
}
```

5. **Replace all colorsSheet references with colors:**
```typescript
// Replace all instances:
colorsSheet.primary → colors.primary
colorsSheet.textPrimary → colors.textPrimary
colorsSheet.screenColor → colors.screenColor
// etc.
```

---

## 🎯 Quick Reference: Color Mappings

All these colors are available in both light and dark themes:

### Primary Colors
- `colors.primary` - Main brand color
- `colors.primaryLight` - Light variant
- `colors.primaryDark` - Dark variant
- `colors.primarySoft` - Soft background

### Text Colors
- `colors.textPrimary` - Main text
- `colors.textSecondary` - Secondary text
- `colors.textLight` - Light text
- `colors.textOnPrimary` - Text on primary background
- `colors.textOnCard` - Text on cards

### Background Colors
- `colors.background` - Main background
- `colors.screenColor` - Screen background
- `colors.cardBackground` - Card background
- `colors.cardBorder` - Card borders

### Status Colors
- `colors.success` - Success state
- `colors.warning` - Warning state
- `colors.error` - Error state
- `colors.info` - Info state

### Neutral Colors
- `colors.white`
- `colors.offWhite`
- `colors.lightGray`
- `colors.gray`
- `colors.darkGray`
- `colors.charcoal`
- `colors.black`

### Button Colors
- `colors.buttonPrimary`
- `colors.buttonSecondary`
- `colors.buttonSuccess`
- `colors.buttonDanger`
- `colors.buttonText`

---

## 🚀 Files Needing Updates

### High Priority (User-facing):
1. `app/(main)/(conference)/doctors-list.tsx` (18 colorsSheet refs)
2. `app/(main)/(conference)/doctor-details.tsx` (29 refs)
3. `app/(main)/(conference)/schedule-appointment.tsx` (50 refs)
4. `app/(main)/(settings)/profile-information.tsx` (19 refs)
5. `app/(main)/(settings)/change-password.tsx` (28 refs)

### Medium Priority:
6. `app/(main)/(chatbot)/chat-history.tsx` (28 refs)
7. `app/(main)/(conference)/select-date.tsx` (15 refs)
8. `app/(main)/(conference)/booking-confirmation.tsx` (28 refs)
9. `app/(main)/(settings)/edit-profile-picture.tsx` (28 refs)
10. `app/(main)/(settings)/payment-methods.tsx` (32 refs)

### Lower Priority:
11. `app/(main)/(conference)/appointment-details.tsx` (41 refs)
12. `app/(main)/(conference)/appointment-summary.tsx` (33 refs)
13. `app/(main)/(settings)/privacy-security.tsx` (15 refs)
14. `app/(main)/(doctor-portal)/register.tsx`
15. `app/(main)/(doctor-portal)/application-status.tsx`

### Auth Screens (Check if they use colorsSheet):
16. `app/(auth)/index.tsx`
17. `app/(auth)/email-login.tsx`
18. `app/(auth)/email-signup.tsx`
19. `app/(auth)/_layout.tsx`

---

## ✨ Current Status

**Progress: 11/27 screens updated (41%)**

**What's Working:**
- ✅ Dashboard fully supports dark mode
- ✅ All exercise screens support dark mode
- ✅ Main chatbot screen supports dark mode
- ✅ Conference landing page supports dark mode
- ✅ Settings main page with dark mode toggle
- ✅ AppHeader component adapts to theme

**What Needs Work:**
- ❌ Conference booking flow (7 screens)
- ❌ Settings sub-pages (5 screens)
- ❌ Doctor portal (2 screens)
- ❌ Chat history (1 screen)
- ❌ Auth screens (if applicable)

---

## 📝 Notes

- The ThemeContext is already set up and working
- Dark mode toggle is in Settings → Preferences → Dark Mode
- Theme preference persists via AsyncStorage
- StatusBar automatically adapts based on theme
- All updated screens will immediately support theme switching

---

## 🔧 Testing Checklist

After updating all files, test:
1. Toggle dark mode in Settings
2. Navigate through all screens
3. Check text readability in both themes
4. Verify buttons and cards adapt properly
5. Test on both light and dark system preferences
