import AppHeader from "@/components/AppHeader";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "./_ui_elements";

export default function EditProfilePicture() {
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState<string | null>(user?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

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
          onPress: () => setSelectedImage(null)
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
      // In a real app, you would upload to Clerk or your backend
      // For now, we'll simulate an upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Edit Profile Picture"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Current Profile Picture */}
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person" size={80} color={colorsSheet.textSecondary} />
                </View>
              )}
              
              {/* Edit Overlay */}
              <TouchableOpacity style={styles.editOverlay} onPress={pickImageFromGallery}>
                <Ionicons name="camera" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.userName}>{user?.fullName || "User"}</Text>
            <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Choose Photo</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={takePhotoWithCamera}>
              <View style={styles.actionIcon}>
                <Ionicons name="camera-outline" size={24} color={colorsSheet.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Take Photo</Text>
                <Text style={styles.actionSubtitle}>Use your camera to take a new photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colorsSheet.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={pickImageFromGallery}>
              <View style={styles.actionIcon}>
                <Ionicons name="images-outline" size={24} color={colorsSheet.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Choose from Gallery</Text>
                <Text style={styles.actionSubtitle}>Select a photo from your device</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colorsSheet.textSecondary} />
            </TouchableOpacity>

            {selectedImage && (
              <TouchableOpacity style={styles.actionButton} onPress={removePhoto}>
                <View style={[styles.actionIcon, { backgroundColor: colorsSheet.error + '20' }]}>
                  <Ionicons name="trash-outline" size={24} color={colorsSheet.error} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colorsSheet.error }]}>Remove Photo</Text>
                  <Text style={styles.actionSubtitle}>Delete your current profile picture</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colorsSheet.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesSection}>
            <Text style={styles.sectionTitle}>Photo Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colorsSheet.success} />
              <Text style={styles.guidelineText}>Use a clear, well-lit photo</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colorsSheet.success} />
              <Text style={styles.guidelineText}>Face should be clearly visible</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={20} color={colorsSheet.success} />
              <Text style={styles.guidelineText}>Avoid group photos</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="close-circle" size={20} color={colorsSheet.error} />
              <Text style={styles.guidelineText}>No offensive or inappropriate content</Text>
            </View>
          </View>

          {/* Upload Button */}
          {selectedImage && (
            <TouchableOpacity 
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsSheet.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  imageContainer: {
    position: 'relative',
    marginBottom: hp(2),
  },
  profileImage: {
    width: hp(18),
    height: hp(18),
    borderRadius: hp(9),
    borderWidth: 3,
    borderColor: colorsSheet.primary,
  },
  placeholderImage: {
    width: hp(18),
    height: hp(18),
    borderRadius: hp(9),
    backgroundColor: colorsSheet.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colorsSheet.primary + '30',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: colorsSheet.primary,
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.5),
  },
  userEmail: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
  },
  actionsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
    marginBottom: hp(2),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: wp(4),
    borderRadius: hp(1.5),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: colorsSheet.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(4),
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.3),
  },
  actionSubtitle: {
    fontSize: hp(1.4),
    color: colorsSheet.textSecondary,
  },
  guidelinesSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  guidelineText: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    marginLeft: wp(2),
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorsSheet.primary,
    marginHorizontal: wp(5),
    paddingVertical: hp(2),
    borderRadius: hp(1.5),
    marginBottom: hp(2),
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
});