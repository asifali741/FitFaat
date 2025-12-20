# Theme System Migration Guide

## ✅ COMPLETED: Foundation (Steps 1 & 2)

### Created Files:
1. **`constants/theme.ts`** - Centralized theme configuration
   - Colors (healthcare palette)
   - Typography scales
   - Spacing system
   - Border radius tokens
   - Shadow presets
   - Component-specific tokens

2. **`components/themed/ThemedButton.tsx`**
   - Variants: primary, secondary, outline, ghost, danger
   - Sizes: small, medium, large
   - States: loading, disabled
   - Full-width option
   - Icon support

3. **`components/themed/ThemedInput.tsx`**
   - Label with required indicator
   - Error state display
   - Left/right icon support
   - Password visibility toggle
   - Focus states with theme colors
   - Keyboard-friendly

4. **`components/themed/ThemedCard.tsx`**
   - Configurable padding
   - Elevation (shadow) options
   - Consistent border radius

5. **`components/themed/KeyboardAwareContainer.tsx`**
   - Auto-scroll focused inputs above keyboard
   - Dismiss keyboard on outside tap
   - Platform-aware (iOS/Android)
   - SafeArea integration
   - Scrollable and non-scrollable modes

---

## 📋 HOW TO USE

### Import Theme
```typescript
import { theme } from '@/constants/theme';
```

### Import Themed Components
```typescript
import { ThemedButton, ThemedInput, ThemedCard, KeyboardAwareContainer } from '@/components/themed';
```

### Example: Themed Button
```typescript
<ThemedButton
  title="Book Appointment"
  variant="primary"
  size="large"
  onPress={handleBooking}
  fullWidth
/>
```

### Example: Themed Input
```typescript
<ThemedInput
  label="Email"
  placeholder="Enter your email"
  keyboardType="email-address"
  leftIcon="mail-outline"
  required
  error={errors.email}
  value={email}
  onChangeText={setEmail}
/>
```

### Example: Keyboard-Aware Form
```typescript
<KeyboardAwareContainer>
  <ThemedCard>
    <ThemedInput label="Name" />
    <ThemedInput label="Email" keyboardType="email-address" />
    <ThemedButton title="Submit" onPress={handleSubmit} />
  </ThemedCard>
</KeyboardAwareContainer>
```

---

## 🎯 NEXT STEPS: Phased Migration

### Phase 1: Auth Screens (PRIORITY)
- [ ] `app/(auth)/login.tsx`
- [ ] `app/(auth)/signup.tsx`
- [ ] `app/(auth)/forgot-password.tsx`
- [ ] `app/(auth)/verify-otp.tsx`

**Migration Checklist per Screen:**
- Replace inline colors with `theme.colors.*`
- Replace custom buttons with `<ThemedButton>`
- Replace TextInput with `<ThemedInput>`
- Wrap form in `<KeyboardAwareContainer>`
- Test keyboard behavior on iOS & Android
- Verify navigation still works

### Phase 2: Chat Screens
- [ ] `components/AppointmentChat.tsx`
- [ ] `app/(main)/(conference)/all-user-chats.tsx`
- [ ] `app/(main)/(doctor-portal)/all-chats.tsx`

**Apply:**
- `theme.colors.chatDoctor` and `theme.colors.chatUser` for message bubbles
- `theme.colors.primary` for send button
- KeyboardAwareContainer for chat input

### Phase 3: Appointment Screens
- [ ] `app/(main)/(conference)/doctor-time-date-selection.tsx`
- [ ] `app/(main)/(conference)/appointment-booking.tsx`
- [ ] `app/(main)/(conference)/my-appointments.tsx`

**Apply:**
- ThemedButton for booking actions
- theme.colors.statusConfirmed, statusPending, statusCancelled
- ThemedCard for appointment items

### Phase 4: Food & Diet Screens
- [ ] Food intake entry screens
- [ ] Nutrition tracking

**Apply:**
- theme.colors.chartProtein, chartCarbs, chartFat
- ThemedInput for calorie/macro entry
- KeyboardAwareContainer for forms

### Phase 5: Dashboard
- [ ] Main dashboard
- [ ] Stats cards

**Apply:**
- theme.colors.background
- ThemedCard for stats
- Chart colors from theme

### Phase 6: Doctor Portal
- [ ] Patient management
- [ ] Schedule management

---

## ⚠️ MIGRATION RULES

1. **DO NOT break functionality**
   - Test after each screen migration
   - Keep business logic unchanged
   - Only refactor UI/styles

2. **Replace colors gradually**
   ```typescript
   // BEFORE
   backgroundColor: '#4CAF50'
   
   // AFTER
   backgroundColor: theme.colors.secondary
   ```

3. **Use themed components where possible**
   ```typescript
   // BEFORE
   <TouchableOpacity style={styles.button}>
     <Text style={styles.buttonText}>Submit</Text>
   </TouchableOpacity>
   
   // AFTER
   <ThemedButton title="Submit" onPress={handleSubmit} />
   ```

4. **Keyboard-friendly inputs**
   - Always wrap forms in `<KeyboardAwareContainer>`
   - Use proper `keyboardType` and `returnKeyType`
   - Add `onSubmitEditing` for "Next" behavior

---

## 🧪 TESTING CHECKLIST

After migrating each screen:
- [ ] Visual appearance matches design
- [ ] All buttons are clickable
- [ ] Navigation works
- [ ] API calls still function
- [ ] Keyboard behavior is smooth (iOS & Android)
- [ ] Input fields scroll above keyboard
- [ ] Error states display correctly
- [ ] Loading states work

---

## 🎨 COLOR REFERENCE QUICK GUIDE

**Primary Actions:** `theme.colors.accent` (#22C55E)
**Secondary Actions:** `theme.colors.primary` (#2E86AB)
**Destructive Actions:** `theme.colors.error` (#EF4444)
**Success Messages:** `theme.colors.success` (#22C55E)
**Warning Messages:** `theme.colors.warning` (#F59E0B)
**Backgrounds:** `theme.colors.background` (#F8FAFC)
**Cards:** `theme.colors.surface` (#FFFFFF)
**Text:** `theme.colors.textPrimary` (#1F2933)
**Borders:** `theme.colors.border` (#E5E7EB)

---

## 📱 RESPONSIVE & ACCESSIBILITY

The theme system is built with:
- Proper contrast ratios for readability
- Touch-friendly button sizes (minimum 44px height)
- Clear focus states
- Consistent spacing for comfortable layouts
- Platform-aware keyboard handling

---

## 🔮 FUTURE ENHANCEMENTS

- Dark mode support (already structured)
- Animation tokens
- Typography variants
- Custom icon set
- Responsive breakpoints

---

**Status:** Foundation Complete ✅
**Next Action:** Migrate auth screens (Phase 1)
