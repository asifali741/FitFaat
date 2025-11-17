import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const ENV = Constants.expoConfig?.extra;

// Get base URL from environment variables or use platform-specific defaults
const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    // Remove trailing /api if it exists (we'll add it explicitly in requests)
    return envUrl.replace(/\/api\/?$/, '');
  }
  // Default: use 10.0.2.2 for Android emulator, localhost for iOS
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001`;
};

const API_URL = getAPIURL();

export default function ProfileInformation() {
  const { colors } = useTheme();
  const { user, isLoaded } = useUser();
  
  const [backendUserData, setBackendUserData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isClerkUser, setIsClerkUser] = useState(false);
  
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

  useEffect(() => {
    checkAuthMethod();
    fetchBackendUserData();
  }, []);

  const checkAuthMethod = async () => {
    // Check if user is logged in with Clerk (has Clerk user object)
    if (user && isLoaded) {
      setIsClerkUser(true);
      console.log("User authenticated with Clerk");
    } else {
      setIsClerkUser(false);
      console.log("User authenticated with backend email");
    }
  };

  const fetchBackendUserData = async () => {
    try {
      setIsLoadingData(true);
      
      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      
      if (!token) {
        Alert.alert(
          "Authentication Required", 
          "No authentication token found. Please log out and log in again.",
          [
            {
              text: "OK",
              onPress: () => setIsLoadingData(false)
            }
          ]
        );
        return;
      }

      const url = `${API_URL}/api/user/profile`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setBackendUserData(data.data);
      } else {
        Alert.alert("Error", data.message || "Failed to load profile data");
      }
    } catch (error) {
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        "Connection Error", 
        `Failed to connect to server. Please check if backend is running.`
      );
    } finally {
      setIsLoadingData(false);
    }
  };

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

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  };

  const getFitnessGoalText = (goal: number) => {
    switch(goal) {
      case 1: return "Weight Loss";
      case 2: return "Muscle Gain";
      case 3: return "Weight Gain";
      default: return "Not Set";
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
          style={[styles.input, multiline && styles.multilineInput]}
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
            {/* Authentication Method Badge */}
            <View style={styles.authBadgeContainer}>
              <View style={[styles.authBadge, { backgroundColor: isClerkUser ? colors.primary : colors.secondary }]}>
                <Ionicons 
                  name={isClerkUser ? "logo-google" : "mail"} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.authBadgeText}>
                  {isClerkUser ? "Clerk Authentication" : "Email Authentication"}
                </Text>
              </View>
            </View>

            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                {(isClerkUser && user?.imageUrl) ? (
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
                {isClerkUser 
                  ? (user?.fullName || "User")
                  : (backendUserData?.user?.userInfo?.name || "User")}
              </Text>
              <Text style={styles.profileEmail}>
                {isClerkUser 
                  ? (user?.primaryEmailAddress?.emailAddress || "")
                  : (backendUserData?.user?.email || "")}
              </Text>
              {!isClerkUser && backendUserData?.user?.username && (
                <Text style={styles.profileUsername}>
                  @{backendUserData.user.username}
                </Text>
              )}
              {isClerkUser && user?.username && (
                <Text style={styles.profileUsername}>
                  @{user.username}
                </Text>
              )}
            </View>

            {/* Edit Button - Only for Clerk users */}
            {isClerkUser && (
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
            )}

            {/* Personal Information - Show based on auth method */}
            {isClerkUser ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information (Clerk)</Text>
              
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
                label="Username (Clerk)" 
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
            ) : null}

            {/* Backend User Information - Only for email auth */}
            {!isClerkUser && backendUserData?.user && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                
                <View style={styles.infoField}>
                  <Text style={styles.label}>Full Name</Text>
                  <Text style={[styles.value, styles.highlightValue]}>
                    {backendUserData.user.userInfo?.name || "Not provided"}
                  </Text>
                </View>

                <View style={styles.infoField}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{backendUserData.user.email}</Text>
                </View>

                <View style={styles.infoField}>
                  <Text style={styles.label}>User ID</Text>
                  <Text style={[styles.value, styles.highlightValue]}>
                    #{backendUserData.user.username}
                  </Text>
                </View>

                <View style={styles.infoField}>
                  <Text style={styles.label}>Member Since</Text>
                  <Text style={styles.value}>
                    {backendUserData.user.createdAt ? new Date(backendUserData.user.createdAt).toLocaleDateString() : "N/A"}
                  </Text>
                </View>

                <View style={styles.infoField}>
                  <Text style={styles.label}>Onboarding Status</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons 
                      name={backendUserData.user.isOnboardingComplete ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={backendUserData.user.isOnboardingComplete ? colors.success : colors.error} 
                    />
                    <Text style={[
                      styles.verifiedText,
                      { color: backendUserData.user.isOnboardingComplete ? colors.success : colors.error }
                    ]}>
                      {backendUserData.user.isOnboardingComplete ? "Complete" : "Incomplete"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Contact Information - Only for Clerk users */}
            {isClerkUser && (
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
            )}

            {/* Backend User Data - Physical Information */}
            {isLoadingData ? (
              <View style={[styles.section, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading user data...</Text>
              </View>
            ) : (
              <>
                {/* Debug/Refresh Section */}
                <View style={styles.section}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={fetchBackendUserData}
                  >
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text style={styles.refreshButtonText}>Refresh Backend Data</Text>
                  </TouchableOpacity>
                  
                  {!backendUserData && (
                    <View style={styles.noDataContainer}>
                      <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
                      <Text style={styles.noDataText}>No backend data available</Text>
                      <Text style={styles.noDataSubtext}>
                        Complete your onboarding to see your fitness data here
                      </Text>
                      <Text style={styles.debugText}>
                        Check console logs for details
                      </Text>
                      <TouchableOpacity 
                        style={styles.debugButton}
                        onPress={async () => {
                          const token = await SecureStore.getItemAsync('fitfaat_auth_token');
                          const user = await SecureStore.getItemAsync('fitfaat_user');
                          Alert.alert(
                            "Debug Info",
                            `API URL: ${API_URL}\n` +
                            `Token exists: ${!!token}\n` +
                            `User exists: ${!!user}\n` +
                            `Is Clerk User: ${isClerkUser}\n` +
                            `Has Backend Data: ${!!backendUserData}\n` +
                            `Check console for full logs`
                          );
                        }}
                      >
                        <Text style={styles.debugButtonText}>Show Debug Info</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {backendUserData?.user?.userInfo ? (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Physical Information</Text>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Full Name</Text>
                    <Text style={styles.value}>{backendUserData.user.userInfo.name || "N/A"}</Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Gender</Text>
                    <Text style={styles.value}>
                      {backendUserData.user.userInfo.gender 
                        ? backendUserData.user.userInfo.gender.charAt(0).toUpperCase() + backendUserData.user.userInfo.gender.slice(1)
                        : "N/A"}
                    </Text>
                  </View>

                  <View style={styles.infoField}>
                    <Text style={styles.label}>Age</Text>
                    <Text style={styles.value}>{backendUserData.user.userInfo.age || "N/A"} years</Text>
                  </View>

                  <View style={styles.infoField}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <Text style={styles.value}>
                      {backendUserData.user.userInfo.birthDate 
                        ? `${backendUserData.user.userInfo.birthDate.day}/${backendUserData.user.userInfo.birthDate.month}/${backendUserData.user.userInfo.birthDate.year}`
                        : "N/A"}
                    </Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Height</Text>
                    <Text style={styles.value}>{backendUserData.user.userInfo.height || "N/A"} cm</Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Weight</Text>
                    <Text style={styles.value}>{backendUserData.user.userInfo.weight || "N/A"} kg</Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>BMI</Text>
                    <Text style={[styles.value, styles.highlightValue]}>
                      {backendUserData.user.userInfo.bmi 
                        ? `${backendUserData.user.userInfo.bmi.toFixed(1)} - ${getBMICategory(backendUserData.user.userInfo.bmi)}`
                        : "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Fitness Information</Text>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Activity Level</Text>
                    <Text style={styles.value}>
                      {backendUserData.user.userInfo.activityLevel 
                        ? backendUserData.user.userInfo.activityLevel.charAt(0).toUpperCase() + backendUserData.user.userInfo.activityLevel.slice(1)
                        : "N/A"}
                    </Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Fitness Goal</Text>
                    <Text style={styles.value}>{getFitnessGoalText(backendUserData.user.userInfo.fitnessGoal)}</Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Daily Calorie Goal</Text>
                    <Text style={[styles.value, styles.highlightValue]}>
                      {backendUserData.user.userInfo.goalCalories || "N/A"} kcal
                    </Text>
                  </View>
                  
                  <View style={styles.infoField}>
                    <Text style={styles.label}>Daily Hydration Goal</Text>
                    <Text style={[styles.value, styles.highlightValue]}>
                      {backendUserData.user.userInfo.hydrationGoal 
                        ? `${backendUserData.user.userInfo.hydrationGoal.toFixed(1)} L`
                        : "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Today's Progress */}
                {backendUserData.todayProgress && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Progress</Text>
                    
                    <View style={styles.progressCard}>
                      <View style={styles.progressItem}>
                        <Ionicons name="flame" size={24} color={colors.primary} />
                        <View style={styles.progressInfo}>
                          <Text style={styles.progressLabel}>Calories</Text>
                          <Text style={styles.progressValue}>
                            {backendUserData.todayProgress.caloriesConsumed || 0} / {backendUserData.todayProgress.targetCalories || 0} kcal
                          </Text>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { 
                                  width: `${Math.min(((backendUserData.todayProgress.caloriesConsumed || 0) / (backendUserData.todayProgress.targetCalories || 1)) * 100, 100)}%`,
                                  backgroundColor: colors.primary
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.progressItem}>
                        <Ionicons name="water" size={24} color={colors.secondary} />
                        <View style={styles.progressInfo}>
                          <Text style={styles.progressLabel}>Hydration</Text>
                          <Text style={styles.progressValue}>
                            {(backendUserData.todayProgress.hydrationLevel || 0).toFixed(1)} / {(backendUserData.todayProgress.targetHydration || 0).toFixed(1)} L
                          </Text>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { 
                                  width: `${Math.min(((backendUserData.todayProgress.hydrationLevel || 0) / (backendUserData.todayProgress.targetHydration || 1)) * 100, 100)}%`,
                                  backgroundColor: colors.secondary
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.infoField}>
                        <Text style={styles.label}>Meals Logged Today</Text>
                        <Text style={styles.value}>{backendUserData.todayProgress.mealsLogged || 0} meals</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Weekly Statistics */}
                {backendUserData.weeklyStats && backendUserData.weeklyStats.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Weekly Stats</Text>
                    
                    {backendUserData.weeklyStats.map((week: any, index: number) => (
                      <View key={index} style={styles.weekCard}>
                        <Text style={styles.weekTitle}>Week {week.week}, {week.year}</Text>
                        <View style={styles.weekStats}>
                          <View style={styles.weekStat}>
                            <Text style={styles.weekStatLabel}>Total Calories</Text>
                            <Text style={styles.weekStatValue}>{week.totalCalories || 0} kcal</Text>
                          </View>
                          <View style={styles.weekStat}>
                            <Text style={styles.weekStatLabel}>Avg Hydration</Text>
                            <Text style={styles.weekStatValue}>{week.averageHydration ? week.averageHydration.toFixed(1) : '0.0'} L</Text>
                          </View>
                          <View style={styles.weekStat}>
                            <Text style={styles.weekStatLabel}>Days Tracked</Text>
                            <Text style={styles.weekStatValue}>{week.daysTracked || 0} days</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </>
        )}

            {/* Clerk Account Information - Only for Clerk users */}
            {isClerkUser && user && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Clerk Account Details</Text>
                
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
            )}

            {isEditing && isClerkUser && (
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
  authBadgeContainer: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(5),
    borderRadius: hp(3),
    gap: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authBadgeText: {
    color: 'white',
    fontSize: hp(1.6),
    fontWeight: '700',
    letterSpacing: 0.3,
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
    paddingBottom: hp(2),
  },
  profileImageContainer: {
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: {
    width: hp(14),
    height: hp(14),
    borderRadius: hp(7),
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  profileInitials: {
    fontSize: hp(4.5),
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  profileName: {
    fontSize: hp(2.8),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: hp(1.7),
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  profileUsername: {
    fontSize: hp(1.6),
    color: colors.primary,
    fontWeight: '700',
    marginTop: hp(0.8),
    backgroundColor: colors.primary + '15',
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
    borderRadius: hp(2),
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: wp(5),
    paddingVertical: hp(1.8),
    borderRadius: hp(2),
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  editButtonText: {
    color: 'white',
    fontSize: hp(1.9),
    fontWeight: '700',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  section: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
    letterSpacing: 0.3,
    paddingLeft: wp(1),
  },
  infoField: {
    backgroundColor: 'white',
    padding: wp(4.5),
    borderRadius: hp(1.8),
    marginBottom: hp(1.2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + '20',
  },
  label: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.7),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: hp(1.9),
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: hp(2.6),
  },
  input: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.gray + '60',
    borderRadius: hp(1.2),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    marginTop: hp(0.5),
    backgroundColor: colors.screenColor,
  },
  multilineInput: {
    minHeight: hp(12),
    textAlignVertical: 'top',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: hp(1.5),
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: hp(1.6),
    fontWeight: '700',
    marginLeft: wp(1.5),
    letterSpacing: 0.3,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(5),
    paddingVertical: hp(1.8),
    borderRadius: hp(2),
    borderWidth: 2,
    borderColor: colors.error,
    marginTop: hp(1),
    backgroundColor: colors.error + '10',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: hp(1.8),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(6),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.7),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  highlightValue: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: hp(2),
  },
  progressCard: {
    backgroundColor: 'white',
    padding: wp(5),
    borderRadius: hp(2),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2.5),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.gray + '20',
  },
  progressInfo: {
    flex: 1,
    marginLeft: wp(3.5),
  },
  progressLabel: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.6),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: hp(1.9),
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: hp(1.2),
  },
  progressBar: {
    height: hp(1.2),
    backgroundColor: colors.gray + '20',
    borderRadius: hp(0.6),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: hp(0.6),
  },
  weekCard: {
    backgroundColor: 'white',
    padding: wp(5),
    borderRadius: hp(2),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  weekTitle: {
    fontSize: hp(1.9),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(2),
    letterSpacing: 0.3,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  weekStat: {
    alignItems: 'center',
    backgroundColor: colors.screenColor,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    borderRadius: hp(1.5),
    flex: 1,
  },
  weekStatLabel: {
    fontSize: hp(1.2),
    color: colors.textSecondary,
    marginBottom: hp(0.6),
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weekStatValue: {
    fontSize: hp(1.8),
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    borderRadius: hp(2),
    marginBottom: hp(2),
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '700',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: hp(5),
    backgroundColor: 'white',
    borderRadius: hp(2.5),
    marginTop: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  noDataText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: hp(2),
    letterSpacing: 0.3,
  },
  noDataSubtext: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    marginTop: hp(1.2),
    textAlign: 'center',
    paddingHorizontal: wp(8),
    lineHeight: hp(2.4),
  },
  debugText: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginTop: hp(2),
    fontStyle: 'italic',
  },
  debugButton: {
    backgroundColor: colors.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(5),
    borderRadius: hp(1.5),
    marginTop: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  debugButtonText: {
    color: 'white',
    fontSize: hp(1.5),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});