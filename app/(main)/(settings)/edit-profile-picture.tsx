import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const ENV = Constants.expoConfig?.extra;

const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001`;
};

const API_URL = getAPIURL();
const PROFILE_IMAGE_KEY = 'fitfaat_profile_image';

export default function EditProfilePicture() {
  const { colors } = useTheme();
  const { user, isLoaded } = useUser();
  const [isClerkUser, setIsClerkUser] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    loadUserData();
  }, [user, isLoaded]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is Clerk user or backend user
      if (user && isLoaded) {
        setIsClerkUser(true);
        setUserName(user.fullName || "User");
        setUserEmail(user.primaryEmailAddress?.emailAddress || "");
        // For Clerk users, use their Clerk image first, then check AsyncStorage
        const savedImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
        setSelectedImage(savedImage || user.imageUrl || null);
      } else {
        setIsClerkUser(false);
        // For backend users, get data from backend API
        const token = await SecureStore.getItemAsync('fitfaat_auth_token');
        const userDataStr = await SecureStore.getItemAsync('fitfaat_user');
        
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserName(userData.username || "User");
          setUserEmail(userData.email || "");
        }
        
        // Fetch profile image from backend
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
              const imageUrl = `${API_URL}${data.data.imageUrl}`;
              setSelectedImage(imageUrl);
            }
          } catch (error) {
            console.log('No profile picture found, using default');
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus.status !== 'granted' || mediaLibraryStatus.status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera and gallery permissions to continue');
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              setSelectedImage(null);
              
              if (isClerkUser) {
                // For Clerk users, remove from AsyncStorage
                await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
              } else {
                // For backend users, call delete API
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
                    console.error('Failed to delete from server:', data.message);
                  }
                }
              }
              
              Alert.alert("Success", "Profile picture removed");
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Alert.alert("Error", "Failed to remove profile picture");
            }
          }
        }
      ]
    );
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select an image first");
      return;
    }

    setIsUploading(true);
    try {
      if (isClerkUser) {
        // For Clerk users, save to AsyncStorage only
        await AsyncStorage.setItem(PROFILE_IMAGE_KEY, selectedImage);
        
        if (user) {
          try {
            await user.setProfileImage({ file: selectedImage });
          } catch (clerkError) {
            console.log('Clerk update not available, image saved locally');
          }
        }
        
        Alert.alert(
          "Success", 
          "Profile picture saved successfully!",
          [{
            text: "OK",
            onPress: () => loadUserData()
          }]
        );
      } else {
        // For backend users, upload to server
        const token = await SecureStore.getItemAsync('fitfaat_auth_token');
        
        if (!token) {
          Alert.alert("Error", "Authentication required. Please log in again.");
          return;
        }

        // Create FormData for multipart upload
        const formData = new FormData();
        
        // Get file extension from URI
        const uriParts = selectedImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        // Add image to form data
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
          Alert.alert(
            "Success", 
            "Profile picture uploaded successfully!",
            [{
              text: "OK",
              onPress: () => loadUserData()
            }]
          );
        } else {
          Alert.alert("Error", data.message || "Failed to upload profile picture");
        }
      }
    } catch (error: any) {
      console.error('Error saving profile picture:', error);
      Alert.alert("Error", error.message || "Failed to save profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
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
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Authentication Badge */}
            <View style={styles.authBadgeContainer}>
              <View style={[styles.authBadge, { backgroundColor: isClerkUser ? colors.primary : colors.secondary }]}>
                <Ionicons 
                  name={isClerkUser ? "logo-google" : "mail"} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.authBadgeText}>
                  {isClerkUser ? "Clerk User" : "Email User"}
                </Text>
              </View>
            </View>

            {/* Current Profile Picture */}
            <View style={styles.imageSection}>
              <View style={styles.imageContainer}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={[styles.profileImage, { borderColor: colors.primary }]} />
                ) : (
                  <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="person" size={80} color={colors.textSecondary} />
                  </View>
                )}
                
                {/* Edit Overlay */}
                <TouchableOpacity style={[styles.editOverlay, { backgroundColor: colors.primary }]} onPress={pickImageFromGallery}>
                  <Ionicons name="camera" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{userName || "User"}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
            </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Choose Photo</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={takePhotoWithCamera}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Take Photo</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Use your camera to take a new photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={pickImageFromGallery}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="images-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Choose from Gallery</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Select a photo from your device</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {selectedImage && (
              <TouchableOpacity style={styles.actionButton} onPress={removePhoto}>
                <View style={[styles.actionIcon, { backgroundColor: colors.error + '20' }]}>
                  <Ionicons name="trash-outline" size={24} color={colors.error} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.error }]}>Remove Photo</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Delete your current profile picture</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Photo Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>Use a clear, well-lit photo</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>Face should be clearly visible</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>Avoid group photos</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>No offensive or inappropriate content</Text>
            </View>
          </View>

          {/* Upload Button */}
          {selectedImage && (
            <TouchableOpacity 
              style={[styles.uploadButton, { backgroundColor: colors.primary }, isUploading && styles.uploadButtonDisabled]}
              onPress={uploadImage}
              disabled={isUploading}
            >
              {isUploading ? (
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color="white" />
                  <Text style={styles.uploadButtonText}>Save Profile Picture</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: hp(4) }} />
        </ScrollView>
        )}
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
    paddingVertical: hp(3),
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