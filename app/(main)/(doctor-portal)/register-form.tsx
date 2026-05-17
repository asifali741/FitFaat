import { useTheme } from '@/contexts/ThemeContext';
import { useDoctorRegistration } from '@/hooks/useDoctorRegistration';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const specializations = [
  'Nutrition',
  'Weight Loss',
  'Weight Gain',
  'Muscle Gain',
  'Fitness Coaching'
];

const domains = [
  'Nutrition',
  'Fitness'
];

const consultationModes = ['In-person', 'Online', 'Phone'];

const genders = ['male', 'female', 'other'];

export default function DoctorRegistrationForm() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { submitDoctorRegistration, isLoading, error, successMessage } = useDoctorRegistration();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    gender: '',
    bio: '',
    yearsOfExperience: '',
    specialization: '',
    qualifications: '',
    university: '',
    domain: '',
    consultationFee: '',
    consultationMode: [] as string[]
  });

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleConsultationMode = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      consultationMode: prev.consultationMode.includes(mode)
        ? prev.consultationMode.filter(m => m !== mode)
        : [...prev.consultationMode, mode]
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      'firstName', 'lastName', 'phoneNumber', 'gender',
      'yearsOfExperience', 'specialization',
      'qualifications', 'university', 'domain'
    ];

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', `Please fill in all required fields: ${missingFields.join(', ')}`);
      return false;
    }

    if (formData.consultationMode.length === 0) {
      Alert.alert('Consultation Mode', 'Please select at least one consultation mode');
      return false;
    }

    const yearsExp = parseInt(formData.yearsOfExperience);
    if (yearsExp < 0 || yearsExp > 70) {
      Alert.alert('Invalid Experience', 'Years of experience must be between 0 and 70');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await submitDoctorRegistration({
        ...formData,
        gender: formData.gender as 'male' | 'female' | 'other',
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : 0,
        languages: ['English']
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit registration');
    }
  };

  const styles = getStyles(colors);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white || '#FFFFFF'}
        translucent={false}
      />
      <View style={[styles.statusBarSpacer, { height: insets.top }]} />
      <LinearGradient
        colors={[colors.primary, colors.primary + 'DD', colors.primary + '99']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="medkit" size={hp(4)} color="white" />
          </View>
          <Text style={styles.headerTitle}>Doctor Registration</Text>
          <Text style={styles.headerSubtitle}>Join our healthcare platform and make a difference</Text>
        </View>
      </LinearGradient>

      {successMessage && (
        <Animated.View style={[styles.successBanner, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.successText}>{successMessage}</Text>
        </Animated.View>
      )}

      {error && (
        <Animated.View style={[styles.errorBanner, { opacity: fadeAnim }]}>
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Personal Information Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}
        >
          <Ionicons name="person" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Ionicons
            name={expandedSection === 'personal' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
            style={styles.sectionChevron}
          />
        </TouchableOpacity>

        {expandedSection === 'personal' && (
          <View style={styles.sectionContent}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+1234567890"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.selectContainer}>
                  {genders.map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.selectButton,
                        formData.gender === gender && styles.selectButtonActive
                      ]}
                      onPress={() => handleInputChange('gender', gender)}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        formData.gender === gender && styles.selectButtonTextActive
                      ]}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
              value={formData.bio}
              onChangeText={(value) => handleInputChange('bio', value)}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Professional Information Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'professional' ? null : 'professional')}
        >
          <Ionicons name="briefcase" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Professional Information</Text>
          <Ionicons
            name={expandedSection === 'professional' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
            style={styles.sectionChevron}
          />
        </TouchableOpacity>

        {expandedSection === 'professional' && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Years of Experience *</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              keyboardType="number-pad"
              value={formData.yearsOfExperience}
              onChangeText={(value) => handleInputChange('yearsOfExperience', value.replace(/[^0-9]/g, ''))}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Specialization *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {specializations.map(spec => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.tag,
                    formData.specialization === spec && styles.tagActive
                  ]}
                  onPress={() => handleInputChange('specialization', spec)}
                >
                  <Text style={[
                    styles.tagText,
                    formData.specialization === spec && styles.tagTextActive
                  ]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Qualifications *</Text>
            <TextInput
              style={styles.input}
              placeholder="MD, PhD"
              value={formData.qualifications}
              onChangeText={(value) => handleInputChange('qualifications', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>University *</Text>
            <TextInput
              style={styles.input}
              placeholder="Harvard Medical School"
              value={formData.university}
              onChangeText={(value) => handleInputChange('university', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Domain *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {domains.map(domain => (
                <TouchableOpacity
                  key={domain}
                  style={[
                    styles.tag,
                    formData.domain === domain && styles.tagActive
                  ]}
                  onPress={() => handleInputChange('domain', domain)}
                >
                  <Text style={[
                    styles.tagText,
                    formData.domain === domain && styles.tagTextActive
                  ]}>
                    {domain}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Job Information Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'job' ? null : 'job')}
        >
          <Ionicons name="business" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Job Information</Text>
          <Ionicons
            name={expandedSection === 'job' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
            style={styles.sectionChevron}
          />
        </TouchableOpacity>

        {expandedSection === 'job' && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Consultation Mode(s) *</Text>
            <View style={styles.checkboxContainer}>
              {consultationModes.map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={styles.checkboxItem}
                  onPress={() => toggleConsultationMode(mode)}
                >
                  <View style={[
                    styles.checkbox,
                    formData.consultationMode.includes(mode) && styles.checkboxChecked
                  ]}>
                    {formData.consultationMode.includes(mode) && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Consultation Fee ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="decimal-pad"
              value={formData.consultationFee}
              onChangeText={(value) => handleInputChange('consultationFee', value)}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={24} color="white" />
              <Text style={styles.submitButtonText}>Submit Registration</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenColor,
    },
    statusBarSpacer: {
      backgroundColor: colors.white || '#FFFFFF',
    },
    header: {
      paddingTop: hp(3),
      paddingBottom: hp(4),
      paddingHorizontal: wp(5),
    },
    headerContent: {
      alignItems: 'center',
    },
    headerIconContainer: {
      width: hp(8),
      height: hp(8),
      borderRadius: hp(4),
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: hp(2),
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    headerTitle: {
      fontSize: hp(3.2),
      fontWeight: 'bold',
      color: 'white',
      marginBottom: hp(1),
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: hp(1.8),
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
      paddingHorizontal: wp(10),
    },
    successBanner: {
      flexDirection: 'row',
      backgroundColor: '#4CAF50',
      padding: wp(4),
      marginHorizontal: wp(4),
      marginTop: hp(2),
      borderRadius: hp(1.5),
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    successText: {
      color: 'white',
      marginLeft: wp(3),
      fontSize: hp(1.7),
      flex: 1,
      fontWeight: '500',
    },
    errorBanner: {
      flexDirection: 'row',
      backgroundColor: '#F44336',
      padding: wp(4),
      marginHorizontal: wp(4),
      marginTop: hp(2),
      borderRadius: hp(1.5),
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#F44336',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    errorText: {
      color: 'white',
      marginLeft: wp(3),
      fontSize: hp(1.7),
      flex: 1,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.screenColor,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      marginTop: 0,
    },
    scrollContent: {
      paddingHorizontal: wp(5),
      paddingTop: hp(3),
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: wp(4),
      borderRadius: 8,
      marginBottom: hp(2),
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    sectionChevron: {
      marginLeft: wp(2),
    },
    sectionTitle: {
      fontSize: hp(2.2),
      fontWeight: '700',
      color: colors.textPrimary,
      marginLeft: wp(3),
      flex: 1,
      letterSpacing: 0.3,
    },
    sectionContent: {
      backgroundColor: colors.cardBackground,
      padding: wp(5),
      borderRadius: hp(2),
      marginBottom: hp(2.5),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    label: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: hp(1),
      marginTop: hp(1.5),
      letterSpacing: 0.2,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: hp(1.2),
      padding: hp(1.8),
      fontSize: hp(1.7),
      color: colors.textPrimary,
      marginBottom: hp(1.5),
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
    },
    textArea: {
      height: hp(12),
      textAlignVertical: 'top',
      paddingTop: hp(1.8),
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: wp(3),
    },
    halfWidth: {
      flex: 1,
    },
    selectContainer: {
      flexDirection: 'row',
      gap: wp(2),
      marginBottom: hp(1.5),
    },
    selectButton: {
      flex: 1,
      paddingVertical: hp(1.3),
      paddingHorizontal: wp(3),
      borderRadius: hp(1.2),
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
    },
    selectButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    selectButtonText: {
      fontSize: hp(1.4),
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
    },
    selectButtonTextActive: {
      color: 'white',
      fontWeight: '700',
    },
    horizontalScroll: {
      marginBottom: hp(1.5),
      paddingVertical: hp(0.5),
    },
    tag: {
      paddingVertical: hp(1),
      paddingHorizontal: wp(4),
      borderRadius: hp(2.5),
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBackground,
      marginRight: wp(2.5),
      marginBottom: hp(1),
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
    },
    tagActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    tagText: {
      fontSize: hp(1.5),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    tagTextActive: {
      color: 'white',
      fontWeight: '700',
    },
    checkboxContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: hp(2),
      gap: wp(4),
    },
    checkboxItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: hp(1),
    },
    checkbox: {
      width: hp(2.8),
      height: hp(2.8),
      borderRadius: hp(0.7),
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: wp(2.5),
      backgroundColor: colors.inputBackground,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      elevation: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    checkboxLabel: {
      fontSize: hp(1.7),
      color: colors.textPrimary,
      fontWeight: '500',
    },
    submitButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      padding: hp(2.2),
      borderRadius: hp(1.5),
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: hp(3),
      marginHorizontal: wp(2),
      elevation: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    submitButtonDisabled: {
      opacity: 0.6,
      elevation: 2,
    },
    submitButtonText: {
      color: 'white',
      fontSize: hp(2.1),
      fontWeight: '700',
      marginLeft: wp(2),
      letterSpacing: 0.5,
    },
    bottomPadding: {
      height: hp(3),
    },
  });
