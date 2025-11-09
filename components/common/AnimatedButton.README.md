# AnimatedButton Component

A versatile, reusable animated button component built with React Native Reanimated for smooth, native-feeling animations throughout the FitFaat app.

## Features

- 🎨 **10 Different Animation Types**: Choose from various animation styles
- ⚡ **High Performance**: Uses React Native Reanimated for 60fps animations
- 🔧 **Easy to Use**: Drop-in replacement for TouchableOpacity
- 📦 **Preset Variants**: Pre-configured buttons for common use cases
- 🎯 **Fully Typed**: Complete TypeScript support

## Installation

The component is already available at `@/components/common/AnimatedButton`

## Basic Usage

```tsx
import AnimatedButton from '@/components/common/AnimatedButton';

<AnimatedButton
  animationType="bounce"
  onPress={() => console.log('Pressed!')}
  style={styles.myButton}
>
  <Text>Click Me!</Text>
</AnimatedButton>
```

## Animation Types

### 1. `scale` (Default)
Simple scale down and up effect. Great for general buttons.
```tsx
<AnimatedButton animationType="scale" onPress={handlePress}>
  <Text>Scale Button</Text>
</AnimatedButton>
```

### 2. `bounce`
Bouncy scale effect with overshoot. Perfect for primary actions.
```tsx
<AnimatedButton animationType="bounce" onPress={handlePress}>
  <Text>Bounce Button</Text>
</AnimatedButton>
```

### 3. `shake`
Horizontal shake effect. Ideal for errors or attention-grabbing.
```tsx
<AnimatedButton animationType="shake" onPress={handlePress}>
  <Text>Shake Button</Text>
</AnimatedButton>
```

### 4. `pulse`
Pulsing scale effect. Great for highlighting important actions.
```tsx
<AnimatedButton animationType="pulse" onPress={handlePress}>
  <Text>Pulse Button</Text>
</AnimatedButton>
```

### 5. `rotate`
Rotation with scale. Fun for interactive elements.
```tsx
<AnimatedButton animationType="rotate" onPress={handlePress}>
  <Text>Rotate Button</Text>
</AnimatedButton>
```

### 6. `slideLeft`
Slides left while scaling. Perfect for back buttons.
```tsx
<AnimatedButton animationType="slideLeft" onPress={handlePress}>
  <Ionicons name="arrow-back" size={24} />
</AnimatedButton>
```

### 7. `slideRight`
Slides right while scaling. Good for forward/next actions.
```tsx
<AnimatedButton animationType="slideRight" onPress={handlePress}>
  <Text>Next →</Text>
</AnimatedButton>
```

### 8. `press`
Simple press down effect. Subtle and professional.
```tsx
<AnimatedButton animationType="press" onPress={handlePress}>
  <Text>Press Button</Text>
</AnimatedButton>
```

### 9. `pop`
Pop out effect with aggressive scale. Excellent for submit buttons.
```tsx
<AnimatedButton animationType="pop" onPress={handlePress}>
  <Text>Submit!</Text>
</AnimatedButton>
```

### 10. `wiggle`
Wiggle rotation effect. Playful and engaging.
```tsx
<AnimatedButton animationType="wiggle" onPress={handlePress}>
  <Text>Wiggle Button</Text>
</AnimatedButton>
```

## Preset Variants

For common use cases, use these preset components:

### AnimatedBackButton
Pre-configured with `slideLeft` animation for back buttons.
```tsx
import { AnimatedBackButton } from '@/components/common/AnimatedButton';

<AnimatedBackButton onPress={() => router.back()}>
  <Ionicons name="arrow-back" size={24} />
</AnimatedBackButton>
```

### AnimatedSubmitButton
Pre-configured with `pop` animation for submit/confirm actions.
```tsx
import { AnimatedSubmitButton } from '@/components/common/AnimatedButton';

<AnimatedSubmitButton onPress={handleSubmit}>
  <Text>Submit</Text>
</AnimatedSubmitButton>
```

### AnimatedActionButton
Pre-configured with `bounce` animation for primary actions.
```tsx
import { AnimatedActionButton } from '@/components/common/AnimatedButton';

<AnimatedActionButton onPress={handleAction}>
  <Text>Get Started</Text>
</AnimatedActionButton>
```

### AnimatedIconButton
Pre-configured with `scale` animation for icon buttons.
```tsx
import { AnimatedIconButton } from '@/components/common/AnimatedButton';

<AnimatedIconButton onPress={handlePress}>
  <Ionicons name="menu" size={24} />
</AnimatedIconButton>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationType` | `AnimationType` | `'scale'` | The type of animation to use |
| `onPress` | `() => void` | - | Function called when button is pressed |
| `style` | `ViewStyle \| ViewStyle[]` | - | Custom styles for the button |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `haptic` | `boolean` | `false` | Enable haptic feedback (web only) |
| `children` | `React.ReactNode` | - | Button content |

Plus all standard TouchableOpacity props.

## Examples

### Auth Screen Buttons
```tsx
// Google Sign In
<AnimatedButton animationType="bounce" onPress={handleGoogleAuth}>
  <Image source={googleIcon} />
  <Text>Continue with Google</Text>
</AnimatedButton>

// Email Login
<AnimatedButton animationType="scale" onPress={handleEmailLogin}>
  <Text>Login with Email</Text>
</AnimatedButton>

// Create Account
<AnimatedButton animationType="pulse" onPress={handleSignup}>
  <Text>Create New Account</Text>
</AnimatedButton>
```

### Card/List Items
```tsx
<AnimatedButton 
  animationType="scale" 
  onPress={() => navigateToDetails(item.id)}
  style={styles.card}
>
  <Text>{item.title}</Text>
  <Text>{item.description}</Text>
</AnimatedButton>
```

### Icon Buttons
```tsx
// Menu Button
<AnimatedIconButton onPress={openMenu}>
  <Ionicons name="menu" size={24} />
</AnimatedIconButton>

// Favorites Button
<AnimatedButton animationType="pulse" onPress={toggleFavorite}>
  <Ionicons name="heart" size={24} />
</AnimatedButton>
```

### Form Buttons
```tsx
// Submit
<AnimatedSubmitButton onPress={handleSubmit} style={styles.submitBtn}>
  <Text>Submit Form</Text>
  <Ionicons name="checkmark" size={20} />
</AnimatedSubmitButton>

// Cancel
<AnimatedBackButton onPress={handleCancel} style={styles.cancelBtn}>
  <Text>Cancel</Text>
</AnimatedBackButton>
```

## Best Practices

1. **Choose the right animation**: Match the animation to the button's purpose
   - `bounce` / `pulse`: Primary actions, important buttons
   - `scale` / `press`: Secondary actions, list items
   - `slideLeft`: Back/cancel buttons
   - `pop`: Submit/confirm actions
   - `wiggle` / `rotate`: Fun, playful interactions

2. **Don't overuse animations**: Not every button needs to be animated

3. **Maintain consistency**: Use similar animations for similar actions

4. **Consider performance**: The component is optimized, but avoid nesting animations

5. **Accessibility**: Animations are visual enhancements; ensure buttons work without them

## Migration Guide

### From TouchableOpacity
```tsx
// Before
<TouchableOpacity onPress={handlePress} style={styles.button}>
  <Text>Button</Text>
</TouchableOpacity>

// After
<AnimatedButton animationType="scale" onPress={handlePress} style={styles.button}>
  <Text>Button</Text>
</AnimatedButton>
```

### From Pressable
```tsx
// Before
<Pressable onPress={handlePress} style={styles.button}>
  <Text>Button</Text>
</Pressable>

// After
<AnimatedButton animationType="bounce" onPress={handlePress} style={styles.button}>
  <Text>Button</Text>
</AnimatedButton>
```

## Troubleshooting

### Animation not working
- Ensure React Native Reanimated is properly installed
- Check that the component is imported correctly
- Verify that `onPress` is provided

### Slow performance
- Reduce the number of animated buttons on screen
- Use simpler animations like `scale` or `press`
- Avoid animating large components

### TypeScript errors
- Ensure proper imports: `import AnimatedButton from '@/components/common/AnimatedButton'`
- Check that style prop matches ViewStyle type

## License

Part of the FitFaat project.
