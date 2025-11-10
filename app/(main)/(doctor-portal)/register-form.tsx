import { useTheme } from '@/contexts/ThemeContext';
import { useDoctorRegistration } from '@/hooks/useDoctorRegistration';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const specializations = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Psychiatry',
  'Pediatrics',
  'Gynecology',
  'Surgery',
  'Dentistry',
  'Physiotherapy',
  'Nutrition',
  'Fitness Coaching',
  'Other'
];

const domains = [
  'Medical',
  'Fitness',
  'Nutrition',
  'Mental Health',
  'Dental',
  'Physiotherapy',
  'Other'
];

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance'];

const consultationModes = ['In-person', 'Online', 'Phone'];

const genders = ['male', 'female', 'other'];

export default function DoctorRegistrationForm() {
  const { colors } = useTheme();
  const { submitDoctorRegistration, isLoading, error, successMessage } = useDoctorRegistration();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    gender: '',
    bio: '',
    licenseNumber: '',
    licenseAuthority: '',
    registrationYear: new Date().getFullYear().toString(),
    yearsOfExperience: '',
    specialization: '',
    qualifications: '',
    university: '',
    domain: '',
    jobType: '',
    clinicName: '',
    clinicAddress: '',
    consultationFee: '',
    consultationMode: [] as string[]
  });

  const [expandedSection, setExpandedSection] = useState<string | null>('personal');

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
      'licenseNumber', 'licenseAuthority', 'yearsOfExperience', 'specialization',
      'qualifications', 'university', 'domain', 'jobType'
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
        registrationYear: parseInt(formData.registrationYear),
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : 0,
        languages: ['English']
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit registration');
    }
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doctor Registration</Text>
        <Text style={styles.headerSubtitle}>Complete your profile to join our platform</Text>
      </View>

      {successMessage && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
          />
        </TouchableOpacity>

        {expandedSection === 'professional' && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="LIC123456"
              value={formData.licenseNumber}
              onChangeText={(value) => handleInputChange('licenseNumber', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>License Authority *</Text>
            <TextInput
              style={styles.input}
              placeholder="Medical Board of State"
              value={formData.licenseAuthority}
              onChangeText={(value) => handleInputChange('licenseAuthority', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Registration Year *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={new Date().getFullYear().toString()}
                  keyboardType="number-pad"
                  value={formData.registrationYear}
                  onChangeText={(value) => handleInputChange('registrationYear', value.replace(/[^0-9]/g, ''))}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Years of Experience *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  keyboardType="number-pad"
                  value={formData.yearsOfExperience}
                  onChangeText={(value) => handleInputChange('yearsOfExperience', value.replace(/[^0-9]/g, ''))}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

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
          />
        </TouchableOpacity>

        {expandedSection === 'job' && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Job Type *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {jobTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tag,
                    formData.jobType === type && styles.tagActive
                  ]}
                  onPress={() => handleInputChange('jobType', type)}
                >
                  <Text style={[
                    styles.tagText,
                    formData.jobType === type && styles.tagTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

            <Text style={styles.label}>Clinic Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Clinic Name"
              value={formData.clinicName}
              onChangeText={(value) => handleInputChange('clinicName', value)}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Clinic Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Address"
              value={formData.clinicAddress}
              onChangeText={(value) => handleInputChange('clinicAddress', value)}
              placeholderTextColor={colors.textSecondary}
            />

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
      backgroundColor: colors.primary,
    },
    header: {
      backgroundColor: colors.primary,
      padding: wp(5),
      paddingTop: hp(3),
    },
    headerTitle: {
      fontSize: hp(3),
      fontWeight: 'bold',
      color: colors.textOnPrimary,
      marginBottom: hp(0.5),
    },
    headerSubtitle: {
      fontSize: hp(1.6),
      color: colors.textSecondary,
    },
    successBanner: {
      flexDirection: 'row',
      backgroundColor: '#4CAF50',
      padding: wp(4),
      marginHorizontal: wp(2),
      borderRadius: hp(1),
      alignItems: 'center',
      marginTop: hp(2),
    },
    successText: {
      color: 'white',
      marginLeft: wp(2),
      fontSize: hp(1.6),
      flex: 1,
    },
    errorBanner: {
      flexDirection: 'row',
      backgroundColor: '#F44336',
      padding: wp(4),
      marginHorizontal: wp(2),
      borderRadius: hp(1),
      alignItems: 'center',
      marginTop: hp(2),
    },
    errorText: {
      color: 'white',
      marginLeft: wp(2),
      fontSize: hp(1.6),
      flex: 1,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.screenColor,
      borderTopLeftRadius: hp(3),
      borderTopRightRadius: hp(3),
      padding: wp(5),
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: wp(4),
      borderRadius: hp(2),
      marginBottom: hp(2),
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: hp(2),
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: wp(3),
      flex: 1,
    },
    sectionContent: {
      backgroundColor: colors.cardBackground,
      padding: wp(4),
      borderRadius: hp(2),
      marginBottom: hp(2),
    },
    label: {
      fontSize: hp(1.6),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: hp(0.8),
      marginTop: hp(1),
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: hp(1),
      padding: hp(1.5),
      fontSize: hp(1.6),
      color: colors.textPrimary,
      marginBottom: hp(1),
    },
    textArea: {
      height: hp(10),
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    halfWidth: {
      width: '48%',
    },
    selectContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    selectButton: {
      flex: 1,
      paddingVertical: hp(1),
      paddingHorizontal: wp(2),
      borderRadius: hp(1),
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBackground,
      marginHorizontal: wp(0.5),
      alignItems: 'center',
    },
    selectButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    selectButtonText: {
      fontSize: hp(1.2),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    selectButtonTextActive: {
      color: colors.textOnPrimary,
      fontWeight: '600',
    },
    horizontalScroll: {
      marginBottom: hp(1),
    },
    tag: {
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3),
      borderRadius: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inputBackground,
      marginRight: wp(2),
      marginBottom: hp(1),
    },
    tagActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagText: {
      fontSize: hp(1.4),
      color: colors.textSecondary,
    },
    tagTextActive: {
      color: colors.textOnPrimary,
      fontWeight: '600',
    },
    checkboxContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: hp(2),
    },
    checkboxItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: wp(5),
      marginBottom: hp(1),
    },
    checkbox: {
      width: hp(2.5),
      height: hp(2.5),
      borderRadius: hp(0.5),
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: wp(2),
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    checkboxLabel: {
      fontSize: hp(1.6),
      color: colors.textPrimary,
    },
    submitButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      padding: hp(2),
      borderRadius: hp(2),
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: hp(2),
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.textOnPrimary,
      fontSize: hp(2),
      fontWeight: '700',
      marginLeft: wp(2),
    },
    bottomPadding: {
      height: hp(5),
    },
  });
