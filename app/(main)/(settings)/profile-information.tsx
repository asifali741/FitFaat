import AppHeader from "@/components/AppHeader";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

export default function ProfileInformation() {
  const { colors } = useTheme();
  const { user, isLoaded } = useUser();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phoneNumber: user?.primaryPhoneNumber?.phoneNumber || "",
    username: user?.username || "",
    bio: "",
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update user profile with Clerk
      await user?.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
      });
      
      setIsEditing(false);
      Alert.alert("Success", "Profile information updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const InfoField = ({ 
    label, 
    value, 
    field, 
    editable = true,
    keyboardType = "default",
    multiline = false 
  }: {
    label: string;
    value: string;
    field: string;
    editable?: boolean;
    keyboardType?: any;
    multiline?: boolean;
  }) => (
    <View style={styles.infoField}>
      <Text style={styles.label}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, { color: colors.textPrimary }]}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
        />
      ) : (
        <Text style={styles.value}>{value || "Not provided"}</Text>
      )}
    </View>
  );

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Profile Information"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                {user?.imageUrl ? (
                  <View style={styles.profileImage}>
                    <Text style={styles.profileInitials}>
                      {(user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.profileImage}>
                    <Ionicons name="person" size={50} color={colors.primary} />
                  </View>
                )}
              </View>
              <Text style={styles.profileName}>
                {user?.fullName || "User"}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>

            {/* Edit Button */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
            >
              <Ionicons 
                name={isEditing ? "checkmark-outline" : "create-outline"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.editButtonText}>
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
              </Text>
            </TouchableOpacity>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <InfoField 
                label="First Name" 
                value={formData.firstName} 
                field="firstName"
              />
              
              <InfoField 
                label="Last Name" 
                value={formData.lastName} 
                field="lastName"
              />
              
              <InfoField 
                label="Username" 
                value={formData.username} 
                field="username"
              />
              
              <InfoField 
                label="Bio" 
                value={formData.bio} 
                field="bio"
                multiline={true}
              />
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <InfoField 
                label="Email" 
                value={formData.email} 
                field="email"
                editable={false}
                keyboardType="email-address"
              />
              
              <InfoField 
                label="Phone Number" 
                value={formData.phoneNumber} 
                field="phoneNumber"
                keyboardType="phone-pad"
              />
            </View>

            {/* Account Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              
              <View style={styles.infoField}>
                <Text style={styles.label}>User ID</Text>
                <Text style={styles.value}>{user?.id || "N/A"}</Text>
              </View>
              
              <View style={styles.infoField}>
                <Text style={styles.label}>Member Since</Text>
                <Text style={styles.value}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </Text>
              </View>
              
              <View style={styles.infoField}>
                <Text style={styles.label}>Email Verified</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons 
                    name={user?.primaryEmailAddress?.verification?.status === "verified" ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={user?.primaryEmailAddress?.verification?.status === "verified" ? colors.success : colors.error} 
                  />
                  <Text style={[
                    styles.verifiedText,
                    { color: user?.primaryEmailAddress?.verification?.status === "verified" ? colors.success : colors.error }
                  ]}>
                    {user?.primaryEmailAddress?.verification?.status === "verified" ? "Verified" : "Not Verified"}
                  </Text>
                </View>
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  // Reset form data
                  setFormData({
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    email: user?.primaryEmailAddress?.emailAddress || "",
                    phoneNumber: user?.primaryPhoneNumber?.phoneNumber || "",
                    username: user?.username || "",
                    bio: "",
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: hp(4) }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  profileImageContainer: {
    marginBottom: hp(2),
  },
  profileImage: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: hp(4),
    fontWeight: 'bold',
    color: colors.primary,
  },
  profileName: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  profileEmail: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: hp(1.5),
    marginBottom: hp(2),
  },
  editButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  section: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(2),
  },
  infoField: {
    backgroundColor: colors.cardBackground,
    padding: wp(4),
    borderRadius: hp(1.5),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
  },
  value: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    fontWeight: '500',
  },
  input: {
    fontSize: hp(1.8),
    backgroundColor: colors.inputBackground || colors.screenColor,
    borderWidth: 1,
    borderColor: colors.inputBorder || colors.cardBorder,
    borderRadius: hp(1),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginTop: hp(0.5),
  },
  multilineInput: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    marginLeft: wp(1),
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: hp(1.5),
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: hp(1),
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
});