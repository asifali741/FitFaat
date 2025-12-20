/**
 * Theme System - Quick Code Snippets
 * Copy-paste ready examples for common patterns
 */

// ============================================
// 1. BASIC FORM SCREEN
// ============================================
import { KeyboardAwareContainer, ThemedButton, ThemedInput } from '@/components/themed';

export default function MyFormScreen() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  return (
    <KeyboardAwareContainer>
      <ThemedInput
        label="Name"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        required
      />
      <ThemedButton title="Submit" onPress={handleSubmit} fullWidth />
    </KeyboardAwareContainer>
  );
}

// ============================================
// 2. INPUT VARIANTS
// ============================================

// Email Input
<ThemedInput
  label="Email"
  placeholder="your@email.com"
  keyboardType="email-address"
  leftIcon="mail-outline"
  autoCapitalize="none"
  required
/>

// Password Input (with visibility toggle)
<ThemedInput
  label="Password"
  placeholder="••••••••"
  secureTextEntry
  leftIcon="lock-closed-outline"
  required
/>

// Phone Number
<ThemedInput
  label="Phone Number"
  placeholder="+1 (555) 123-4567"
  keyboardType="phone-pad"
  leftIcon="call-outline"
/>

// Number Input
<ThemedInput
  label="Age"
  placeholder="25"
  keyboardType="numeric"
  leftIcon="person-outline"
/>

// Multiline Text
<ThemedInput
  label="Description"
  placeholder="Enter details..."
  multiline
  numberOfLines={4}
/>

// ============================================
// 3. BUTTON VARIANTS
// ============================================

// Primary Action (Fresh Green - #22C55E)
<ThemedButton 
  title="Book Appointment" 
  variant="primary" 
  onPress={handleBook}
  fullWidth
/>

// Secondary Action (Medical Blue - #2E86AB)
<ThemedButton 
  title="View Details" 
  variant="secondary"
  size="medium"
/>

// Outline Style
<ThemedButton 
  title="Cancel" 
  variant="outline"
  onPress={handleCancel}
/>

// Danger/Destructive
<ThemedButton 
  title="Delete" 
  variant="danger"
  size="small"
/>

// Loading State
<ThemedButton 
  title="Processing..." 
  variant="primary"
  loading
  disabled
/>

// ============================================
// 4. CARD LAYOUTS
// ============================================
import { ThemedCard } from '@/components/themed';
import { theme } from '@/constants/theme';

<ThemedCard padding="lg" elevation="medium">
  <Text style={{ fontSize: theme.typography.fontSize.lg }}>
    Card Content
  </Text>
</ThemedCard>

// Custom Card
<ThemedCard 
  padding="xl" 
  elevation="large"
  style={{ marginVertical: theme.spacing.md }}
>
  {children}
</ThemedCard>

// ============================================
// 5. KEYBOARD-AWARE FORMS
// ============================================

// Scrollable Form
<KeyboardAwareContainer scrollable>
  <ThemedInput label="Field 1" />
  <ThemedInput label="Field 2" />
  <ThemedInput label="Field 3" />
  <ThemedButton title="Submit" />
</KeyboardAwareContainer>

// Non-Scrollable (for short forms)
<KeyboardAwareContainer scrollable={false}>
  <ThemedInput label="Quick Entry" />
  <ThemedButton title="Submit" />
</KeyboardAwareContainer>

// With Custom Offset (for headers)
<KeyboardAwareContainer keyboardVerticalOffset={80}>
  {/* Form content */}
</KeyboardAwareContainer>

// ============================================
// 6. USING THEME COLORS DIRECTLY
// ============================================
import { theme } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,  // #F8FAFC
    padding: theme.spacing.lg,                 // 16
  },
  card: {
    backgroundColor: theme.colors.surface,     // #FFFFFF
    borderRadius: theme.borderRadius.medium,   // 12
    ...theme.shadows.medium,
  },
  primaryText: {
    color: theme.colors.textPrimary,          // #1F2933
    fontSize: theme.typography.fontSize.base,  // 16
  },
  button: {
    backgroundColor: theme.colors.accent,      // #22C55E
    paddingVertical: theme.spacing.md,         // 12
  },
});

// ============================================
// 7. STATUS INDICATORS
// ============================================

// Success Status
<View style={{ 
  backgroundColor: theme.colors.success, 
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.small 
}}>
  <Text style={{ color: theme.colors.surface }}>Success!</Text>
</View>

// Warning Status
<View style={{ backgroundColor: theme.colors.warning }}>
  <Text>Warning</Text>
</View>

// Error Status
<View style={{ backgroundColor: theme.colors.error }}>
  <Text>Error</Text>
</View>

// Appointment Status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return theme.colors.statusConfirmed;
    case 'pending':
      return theme.colors.statusPending;
    case 'cancelled':
      return theme.colors.statusCancelled;
    default:
      return theme.colors.border;
  }
};

// ============================================
// 8. CHAT MESSAGE BUBBLES
// ============================================

// Doctor Message
<View style={{
  backgroundColor: theme.colors.chatDoctor,  // #E0F2FE
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.medium,
  alignSelf: 'flex-start',
}}>
  <Text style={{ color: theme.colors.textPrimary }}>
    Doctor's message
  </Text>
</View>

// User Message
<View style={{
  backgroundColor: theme.colors.chatUser,    // #DCFCE7
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.medium,
  alignSelf: 'flex-end',
}}>
  <Text style={{ color: theme.colors.textPrimary }}>
    User's message
  </Text>
</View>

// ============================================
// 9. CHART/NUTRITION COLORS
// ============================================

// Progress Bars
<View style={{
  backgroundColor: theme.colors.chartProtein,  // Protein - #22C55E
  height: 8,
  borderRadius: 4,
}} />

<View style={{
  backgroundColor: theme.colors.chartCarbs,    // Carbs - #2E86AB
}} />

<View style={{
  backgroundColor: theme.colors.chartFat,      // Fat - #F59E0B
}} />

<View style={{
  backgroundColor: theme.colors.chartCalories, // Calories - #F97316
}} />

// ============================================
// 10. VALIDATION WITH THEMED INPUT
// ============================================

const [email, setEmail] = useState('');
const [error, setError] = useState('');

const validateEmail = (text: string) => {
  setEmail(text);
  if (!text.includes('@')) {
    setError('Invalid email format');
  } else {
    setError('');
  }
};

<ThemedInput
  label="Email"
  value={email}
  onChangeText={validateEmail}
  error={error}
  leftIcon="mail-outline"
  keyboardType="email-address"
  required
/>

// ============================================
// 11. FORM WITH VALIDATION
// ============================================

const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({ name: '', email: '' });

const validate = () => {
  const newErrors = { name: '', email: '' };
  if (!formData.name) newErrors.name = 'Name is required';
  if (!formData.email.includes('@')) newErrors.email = 'Invalid email';
  setErrors(newErrors);
  return !newErrors.name && !newErrors.email;
};

const handleSubmit = () => {
  if (validate()) {
    // Submit form
  }
};

<KeyboardAwareContainer>
  <ThemedInput
    label="Name"
    value={formData.name}
    onChangeText={(text) => setFormData({ ...formData, name: text })}
    error={errors.name}
    required
  />
  <ThemedInput
    label="Email"
    value={formData.email}
    onChangeText={(text) => setFormData({ ...formData, email: text })}
    error={errors.email}
    keyboardType="email-address"
    required
  />
  <ThemedButton title="Submit" onPress={handleSubmit} fullWidth />
</KeyboardAwareContainer>

// ============================================
// 12. SPACING HELPERS
// ============================================

// Vertical Spacing
<View style={{ marginVertical: theme.spacing.md }} />
<View style={{ marginVertical: theme.spacing.lg }} />
<View style={{ marginVertical: theme.spacing.xl }} />

// Horizontal Spacing
<View style={{ marginHorizontal: theme.spacing.md }} />

// Padding
<View style={{ padding: theme.spacing.lg }} />
<View style={{ paddingHorizontal: theme.spacing.xl }} />

// Gap (for flexbox)
<View style={{ gap: theme.spacing.sm }}>
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</View>

// ============================================
// 13. SHADOW PRESETS
// ============================================

// Small shadow
<View style={[styles.card, theme.shadows.small]} />

// Medium shadow
<View style={[styles.card, theme.shadows.medium]} />

// Large shadow
<View style={[styles.card, theme.shadows.large]} />

// ============================================
// 14. BORDER RADIUS VARIANTS
// ============================================

// Small radius (8px)
<View style={{ borderRadius: theme.borderRadius.small }} />

// Medium radius (12px)
<View style={{ borderRadius: theme.borderRadius.medium }} />

// Large radius (16px)
<View style={{ borderRadius: theme.borderRadius.large }} />

// Full circle
<View style={{ borderRadius: theme.borderRadius.full }} />

// ============================================
// 15. TYPOGRAPHY
// ============================================

// Heading
<Text style={{
  fontSize: theme.typography.fontSize.xxxl,
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.textPrimary,
}}>
  Main Heading
</Text>

// Subheading
<Text style={{
  fontSize: theme.typography.fontSize.xl,
  fontWeight: theme.typography.fontWeight.semiBold,
  color: theme.colors.textPrimary,
}}>
  Subheading
</Text>

// Body Text
<Text style={{
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.textPrimary,
}}>
  Body content
</Text>

// Secondary Text
<Text style={{
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
}}>
  Secondary info
</Text>
