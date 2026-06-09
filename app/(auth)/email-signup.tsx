import AppHeader from '../../components/AppHeader';
import SignupThemed from '../../components/authentication/SignupThemed';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmailSignupScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <AppHeader title="Sign Up" showBackButton showMenuButton={false} />
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <SignupThemed />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});
