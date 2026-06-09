import AppHeader from '../../components/AppHeader';
import LoginThemed from '../../components/authentication/LoginThemed';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmailLoginScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <AppHeader title="Login" showBackButton showMenuButton={false} />
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <LoginThemed />
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
