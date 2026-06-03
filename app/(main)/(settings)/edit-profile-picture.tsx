import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as ImagePicker from 'expo-image-picker';
import * as NavigationBar from 'expo-navigation-bar';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBackendBaseUrl } from '@/utils/config';
import {
  getGmailProfileImageUrl,
  getProfileImageUserKey,
  readCachedProfileImage,
  resolveBackendImageUrl,
  withProfileImageVersion,
  writeCachedProfileImage,
} from '@/utils/profileImage';
import { profileImageEvents } from '@/utils/profileImageEvents';

const ENV = Constants.expoConfig?.extra;

const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return getBackendBaseUrl();
};

const API_URL = getAPIURL();

export default function EditProfilePicture() {
  const { colors } = useTheme();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingChange, setHasPendingChange] = useState(false);
  const [isPendingRemoval, setIsPendingRemoval] = useState(false);

  useEffect(() => {
    loadUserData();

    // Set Android navigation bar to white
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');
    }
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      const userDataStr = await SecureStore.getItemAsync('fitfaat_user');
      let userData: any = null;
      
      if (userDataStr) {
        userData = JSON.parse(userDataStr);

        const cachedProfileImage = await readCachedProfileImage(userData);
        if (cachedProfileImage?.backendImageUrl) {
          setCurrentImage(cachedProfileImage.backendImageUrl);
          setSelectedImage(cachedProfileImage.backendImageUrl);
        }
      }

      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/user/profile-picture`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          if (data.success && data.data.imageUrl) {
            const imageUrl = resolveBackendImageUrl(API_URL, data.data.imageUrl);
            setCurrentImage(imageUrl);
            setSelectedImage(imageUrl);
            await writeCachedProfileImage(userData, {
              backendImageUrl: imageUrl,
              gmailImageUrl: getGmailProfileImageUrl(userData),
            });
          }
        } catch {
          console.log('No profile picture found, using default');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setHasPendingChange(false);
      setIsPendingRemoval(false);
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permission to continue');
      return false;
    }

    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaLibraryStatus.status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant gallery permission to continue');
      return false;
    }

    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setHasPendingChange(true);
      setIsPendingRemoval(false);
    }
  };

  const takePhotoWithCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setHasPendingChange(true);
      setIsPendingRemoval(false);
    }
  };

  const markPhotoForRemoval = () => {
    setSelectedImage(null);
    setHasPendingChange(true);
    setIsPendingRemoval(true);
  };

  const openPhotoOptions = () => {
    const options: AlertButton[] = [
      { text: "Take Photo", onPress: takePhotoWithCamera },
      { text: "Choose From Gallery", onPress: pickImageFromGallery },
    ];

    if (currentImage || selectedImage) {
      options.push({ text: "Remove Photo", onPress: removePhoto });
    }

    Alert.alert("Change Photo", "Choose how you want to update your profile picture.", [
      ...options,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = () => {
    Alert.alert(
      "Remove Photo",
      "This will remove your profile picture after you tap Save Profile Picture.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: markPhotoForRemoval,
        }
      ]
    );
  };

  const deleteProfilePicture = async () => {
    const token = await SecureStore.getItemAsync('fitfaat_auth_token');
    
    if (token) {
      const response = await fetch(`${API_URL}/api/user/delete-profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to remove profile picture');
      }
    }

    const userDataStr = await SecureStore.getItemAsync('fitfaat_user');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const updatedAt = new Date().toISOString();
    const gmailImageUrl = getGmailProfileImageUrl(userData);
    await writeCachedProfileImage(userData, {
      backendImageUrl: null,
      gmailImageUrl,
    }, updatedAt);
    
    profileImageEvents.emit({
      backendImageUrl: null,
      displayImageUrl: gmailImageUrl,
      gmailImageUrl,
      removed: true,
      updatedAt,
      userKey: getProfileImageUserKey(userData),
    });

    setCurrentImage(null);
    setSelectedImage(null);
    setHasPendingChange(false);
    setIsPendingRemoval(false);
  };

  const uploadImage = async () => {
    if (!hasPendingChange) {
      Alert.alert("No Changes", "Choose or remove a photo before saving.");
      return;
    }

    setIsUploading(true);
    try {
      if (isPendingRemoval) {
        await deleteProfilePicture();
        Alert.alert("Success", "Profile picture removed");
        return;
      }

      if (!selectedImage) {
        Alert.alert("No Image", "Please select an image first");
        return;
      }

      const token = await SecureStore.getItemAsync('fitfaat_auth_token');

      if (!token) {
        Alert.alert("Error", "Authentication required. Please log in again.");
        return;
      }

      const formData = new FormData();
      const uriParts = selectedImage.split('.');
      const rawFileType = uriParts[uriParts.length - 1]?.split(/[?#]/)[0];
      const fileType = rawFileType && rawFileType.length <= 5 ? rawFileType : 'jpg';

      formData.append('profileImage', {
        uri: selectedImage,
        name: `profile.${fileType}`,
        type: `image/${fileType}`
      } as any);

      const response = await fetch(`${API_URL}/api/user/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const userDataStr = await SecureStore.getItemAsync('fitfaat_user');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const updatedAt = new Date().toISOString();
        const uploadedImageUrl = resolveBackendImageUrl(
          API_URL,
          data?.data?.imageUrl || data?.imageUrl || data?.profileImageUrl || data?.profileImage
        );
        const displayImageUrl = withProfileImageVersion(uploadedImageUrl || selectedImage, updatedAt);
        const immediateDisplayImageUrl = /^(file|content|ph):/i.test(selectedImage)
          ? selectedImage
          : displayImageUrl;
        const gmailImageUrl = getGmailProfileImageUrl(userData);

        if (uploadedImageUrl) {
          await writeCachedProfileImage(userData, {
            backendImageUrl: displayImageUrl || uploadedImageUrl,
            gmailImageUrl,
          }, updatedAt);
        }

        const storedUser = await tokenStorage.getUser();
        if (storedUser) {
          await tokenStorage.saveUser({
            ...storedUser,
            profileImage: data.data?.profileImage || storedUser.profileImage || null,
            profileImageUrl: data.data?.imageUrl || uploadedImageUrl || storedUser.profileImageUrl || null,
          });
        }

        if (displayImageUrl) {
          setCurrentImage(displayImageUrl);
          setSelectedImage(displayImageUrl);
        }
        setHasPendingChange(false);
        setIsPendingRemoval(false);

        profileImageEvents.emit({
          backendImageUrl: displayImageUrl || uploadedImageUrl,
          displayImageUrl: immediateDisplayImageUrl || displayImageUrl || uploadedImageUrl || selectedImage,
          gmailImageUrl,
          updatedAt,
          userKey: getProfileImageUserKey(userData),
        });
        Alert.alert(
          "Success", 
          "Profile picture uploaded successfully!"
        );
      } else {
        Alert.alert("Error", data.message || "Failed to upload profile picture");
      }
    } catch (error: any) {
      console.error('Error saving profile picture:', error);
      Alert.alert("Error", error.message || "Failed to save profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const styles = getStyles(colors);
  const previewStatusText = isPendingRemoval
    ? "Photo will be removed"
    : hasPendingChange
      ? "New photo selected"
      : selectedImage
        ? "Current photo"
        : "No profile photo";
  const canSaveProfilePicture = hasPendingChange && !isUploading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <AppHeader 
        title="Edit Profile Picture"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.imageSection}>
              <View style={styles.imageContainer}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={[styles.profileImage, { borderColor: colors.primary }]}
                  />
                ) : (
                  <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="person" size={80} color={colors.textSecondary} />
                  </View>
                )}
              </View>

              <Text style={[styles.previewStatus, { color: colors.textSecondary }]}>
                {previewStatusText}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.changePhotoButton, { borderColor: colors.primary, backgroundColor: colors.cardBackground }]}
              onPress={openPhotoOptions}
              disabled={isUploading}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.uploadButton,
                { backgroundColor: colors.primary },
                !canSaveProfilePicture && styles.uploadButtonDisabled,
              ]}
              onPress={uploadImage}
              disabled={!canSaveProfilePicture}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                  <Text style={styles.uploadButtonText}>Save Profile Picture</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.tipsSection, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>Photo Tips</Text>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={19} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>Use a clear face photo.</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={19} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>Avoid blurry or dark images.</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={19} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>Square photos work best.</Text>
              </View>
            </View>
        </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor || '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(5),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.7),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  authBadgeContainer: {
    alignItems: 'center',
    paddingTop: hp(2),
    paddingBottom: hp(1),
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
  imageSection: {
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  imageContainer: {
    position: 'relative',
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImage: {
    width: hp(20),
    height: hp(20),
    borderRadius: hp(10),
    borderWidth: 4,
  },
  placeholderImage: {
    width: hp(20),
    height: hp(20),
    borderRadius: hp(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  previewStatus: {
    fontSize: hp(1.55),
    fontWeight: '700',
    marginTop: hp(0.4),
  },
  changePhotoButton: {
    minHeight: hp(5.8),
    borderRadius: hp(1.4),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.4),
    marginBottom: hp(1.5),
  },
  changePhotoText: {
    fontSize: hp(1.75),
    fontWeight: '800',
  },
  editOverlay: {
    position: 'absolute',
    bottom: hp(0.5),
    right: hp(0.5),
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: hp(2.8),
    fontWeight: '800',
    marginBottom: hp(0.5),
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: hp(1.7),
    letterSpacing: 0.2,
  },
  actionsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
    marginTop: hp(2),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: '800',
    marginBottom: hp(2),
    letterSpacing: 0.3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: wp(4.5),
    borderRadius: hp(1.8),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + '30',
  },
  actionIcon: {
    width: hp(5.5),
    height: hp(5.5),
    borderRadius: hp(2.75),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(4),
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: hp(1.9),
    fontWeight: '700',
    marginBottom: hp(0.4),
    letterSpacing: 0.3,
  },
  actionSubtitle: {
    fontSize: hp(1.5),
    fontWeight: '500',
  },
  guidelinesSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
    backgroundColor: 'white',
    padding: wp(5),
    borderRadius: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsSection: {
    padding: wp(4),
    borderRadius: hp(1.4),
    marginTop: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: hp(1.8),
    fontWeight: '800',
    marginBottom: hp(1.2),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.8),
  },
  tipText: {
    flex: 1,
    fontSize: hp(1.5),
    lineHeight: hp(2.1),
    marginLeft: wp(2.3),
    fontWeight: '600',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  guidelineText: {
    fontSize: hp(1.6),
    marginLeft: wp(2.5),
    fontWeight: '500',
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(5),
    paddingVertical: hp(2.2),
    borderRadius: hp(2),
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: hp(1.9),
    fontWeight: '800',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
});
