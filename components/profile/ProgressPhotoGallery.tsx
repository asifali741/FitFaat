import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import { cachedRequestJson, clearRequestJsonCachesWithPrefix, fetchWithTimeout } from '@/utils/apiHelper';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';
import { localSyncEvents } from '@/utils/localSyncEvents';
import { resolveBackendImageUrl } from '@/utils/profileImage';

type ProgressPhoto = {
  id: string;
  uri: string;
  createdAt: string;
  isLocalOnly?: boolean;
};

type ProgressPhotoGalleryProps = {
  userId?: string | null;
  colors: any;
};

const BASE_STORAGE_KEY = 'fitfaat_progress_photos';
const PHOTO_DIRECTORY = `${FileSystem.documentDirectory || ''}progress-photos/`;
const PROGRESS_PHOTO_READ_CONFIG = {
  timeoutMs: 7000,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 5 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1800,
  refreshCacheInBackground: true,
};

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved photo';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const sortPhotos = (photos: ProgressPhoto[]) =>
  [...photos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const isLocalDeviceUri = (uri?: string) => !!uri && /^(file|content|ph):/i.test(uri);

const isReadableLocalPhoto = async (uri: string) => {
  if (!uri.startsWith('file:')) return true;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists;
  } catch {
    return false;
  }
};

const getImageFileInfo = (uri: string) => {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const normalizedExtension = extension === 'jpeg' || extension === 'jpg' ? 'jpg' : extension;
  const mimeType = normalizedExtension === 'jpg' ? 'image/jpeg' : `image/${normalizedExtension}`;

  return {
    name: `progress-${Date.now()}.${normalizedExtension}`,
    type: mimeType,
  };
};

const ensurePhotoDirectory = async () => {
  if (!FileSystem.documentDirectory) return null;

  const directoryInfo = await FileSystem.getInfoAsync(PHOTO_DIRECTORY);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIRECTORY, { intermediates: true });
  }

  return PHOTO_DIRECTORY;
};

const copyPhotoToAppStorage = async (uri: string) => {
  try {
    const directory = await ensurePhotoDirectory();
    if (!directory || !isLocalDeviceUri(uri)) return uri;

    const fileInfo = getImageFileInfo(uri);
    const destinationUri = `${directory}${Date.now()}-${fileInfo.name}`;
    await FileSystem.copyAsync({ from: uri, to: destinationUri });
    return destinationUri;
  } catch (error) {
    console.log('[ProgressPhotoGallery] Could not copy photo locally:', error);
    return uri;
  }
};

export function ProgressPhotoGallery({ userId, colors }: ProgressPhotoGalleryProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const storageKey = `${BASE_STORAGE_KEY}:${userId || 'local'}`;
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [compareVisible, setCompareVisible] = useState(false);
  const [compareRatio, setCompareRatio] = useState(0.5);
  const [compareWidth, setCompareWidth] = useState(1);
  const [syncReloadToken, setSyncReloadToken] = useState(0);

  const orderedPhotos = useMemo(() => sortPhotos(photos), [photos]);
  const beforePhoto = orderedPhotos[0] || null;
  const afterPhoto = orderedPhotos[orderedPhotos.length - 1] || null;

  const updateCompareRatio = useCallback((x: number) => {
    if (!compareWidth) return;
    setCompareRatio(Math.min(0.96, Math.max(0.04, x / compareWidth)));
  }, [compareWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateCompareRatio(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateCompareRatio(event.nativeEvent.locationX),
      }),
    [updateCompareRatio]
  );

  const persistPhotos = useCallback(async (nextPhotos: ProgressPhoto[]) => {
    const sortedPhotos = sortPhotos(nextPhotos);
    setPhotos(sortedPhotos);
    await AsyncStorage.setItem(storageKey, JSON.stringify(sortedPhotos));
  }, [storageKey]);

  const normalizeRemotePhoto = useCallback((photo: any): ProgressPhoto | null => {
    const baseUrl = getBackendBaseUrl();
    const id = photo?.id || photo?._id || photo?.photoId || photo?.progressPhotoId;
    const imagePath =
      photo?.imageUrl ||
      photo?.photoUrl ||
      photo?.url ||
      photo?.uri ||
      photo?.path ||
      photo?.filename ||
      photo?.fileName;
    const createdAt =
      photo?.createdAt ||
      photo?.uploadedAt ||
      photo?.updatedAt ||
      photo?.date;
    const uri = resolveBackendImageUrl(baseUrl, imagePath);

    if (!id || !uri) return null;

    return {
      id: String(id),
      uri,
      createdAt: createdAt ? String(createdAt) : new Date().toISOString(),
    };
  }, []);

  const readLocalPhotos = useCallback(async () => {
    const rawPhotos = await AsyncStorage.getItem(storageKey);
    const parsedPhotos = rawPhotos ? JSON.parse(rawPhotos) : [];
    if (!Array.isArray(parsedPhotos)) return [];

    const readablePhotos = await Promise.all(
      parsedPhotos
        .filter((photo) => photo?.uri && photo?.createdAt)
        .map(async (photo) => (
          isLocalDeviceUri(photo.uri) && !(await isReadableLocalPhoto(photo.uri))
            ? null
            : photo
        ))
    );

    return readablePhotos.filter((photo): photo is ProgressPhoto => !!photo);
  }, [storageKey]);

  useEffect(() => {
    const unsubscribe = localSyncEvents.subscribe((event) => {
      if (event.restoredKeys.includes(storageKey)) {
        setSyncReloadToken(Date.now());
      }
    });

    return unsubscribe;
  }, [storageKey]);

  const fetchRemotePhotos = useCallback(async () => {
    const token = await tokenStorage.getToken();
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) return null;

    try {
      const user = await tokenStorage.getUser();
      const cacheUserKey = user?._id || user?.id || user?.userId || 'current';
      const data = await cachedRequestJson<any>(
        `progress-photos:${cacheUserKey}`,
        `${baseUrl}/api/user/progress-photos`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        PROGRESS_PHOTO_READ_CONFIG
      );
      const remotePhotos = Array.isArray(data?.photos)
        ? data.photos
        : Array.isArray(data?.data?.photos)
          ? data.data.photos
          : Array.isArray(data?.data)
            ? data.data
            : [];
      return remotePhotos
        .map(normalizeRemotePhoto)
        .filter((photo: ProgressPhoto | null): photo is ProgressPhoto => !!photo);
    } catch (error) {
      console.log('[ProgressPhotoGallery] Remote photo fetch failed:', error);
      return null;
    }
  }, [normalizeRemotePhoto]);

  const uploadProgressPhoto = useCallback(async (uri: string, createdAt: string) => {
    const token = await tokenStorage.getToken();
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) return null;

    const fileInfo = getImageFileInfo(uri);
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: fileInfo.name,
      type: fileInfo.type,
    } as any);
    formData.append('createdAt', createdAt);

    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/user/progress-photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }, 15000);

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) return null;

      clearRequestJsonCachesWithPrefix('progress-photos:').catch(() => {});
      return normalizeRemotePhoto(data.photo || data?.data?.photo || data?.data);
    } catch (error) {
      console.log('[ProgressPhotoGallery] Progress photo upload failed:', error);
      return null;
    }
  }, [normalizeRemotePhoto]);

  const migrateLocalPhotosToCloud = useCallback(async (localPhotos: ProgressPhoto[]) => {
    const migratedPhotos: { localId: string; photo: ProgressPhoto }[] = [];

    for (const photo of localPhotos) {
      if (!isLocalDeviceUri(photo.uri)) continue;

      const uploadedPhoto = await uploadProgressPhoto(photo.uri, photo.createdAt);
      if (uploadedPhoto) {
        migratedPhotos.push({ localId: photo.id, photo: uploadedPhoto });
      }
    }

    return migratedPhotos;
  }, [uploadProgressPhoto]);

  useEffect(() => {
    let isActive = true;

    const loadPhotos = async () => {
      setIsLoading(true);
      try {
        const localPhotos = await readLocalPhotos();
        if (!isActive) return;

        setPhotos(sortPhotos(localPhotos));
        setIsLoading(false);

        const remotePhotos = await fetchRemotePhotos();

        if (!isActive || !remotePhotos) return;

        const migratedPhotos = await migrateLocalPhotosToCloud(localPhotos);
        if (!isActive) return;

        const mergedPhotos = [...remotePhotos];
        const migratedLocalIds = new Set(migratedPhotos.map((item) => item.localId));

        migratedPhotos.forEach(({ photo }) => {
          if (!mergedPhotos.some((existingPhoto) => existingPhoto.id === photo.id)) {
            mergedPhotos.push(photo);
          }
        });

        localPhotos.forEach((photo) => {
          const alreadyMerged = mergedPhotos.some(
            (existingPhoto) => existingPhoto.id === photo.id || existingPhoto.uri === photo.uri
          );
          if (!alreadyMerged && !migratedLocalIds.has(photo.id)) {
            mergedPhotos.push(photo);
          }
        });

        await persistPhotos(mergedPhotos);
      } catch (error) {
        console.log('[ProgressPhotoGallery] Failed to load photos:', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPhotos();

    return () => {
      isActive = false;
    };
  }, [fetchRemotePhotos, migrateLocalPhotosToCloud, persistPhotos, readLocalPhotos, syncReloadToken]);

  const saveSelectedPhoto = async (uri: string) => {
    const createdAt = new Date().toISOString();
    const localUri = await copyPhotoToAppStorage(uri);
    const localPhoto = {
      id: `local-${Date.now()}`,
      uri: localUri,
      createdAt,
      isLocalOnly: true,
    };

    await persistPhotos([...photos, localPhoto]);

    const uploadedPhoto = await uploadProgressPhoto(localUri, createdAt);
    if (uploadedPhoto) {
      await persistPhotos([...photos, uploadedPhoto]);
    }
  };

  const deleteRemotePhoto = async (photoId: string) => {
    const token = await tokenStorage.getToken();
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) return false;

    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/user/progress-photos/${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, 12000);

      if (response.ok) {
        clearRequestJsonCachesWithPrefix('progress-photos:').catch(() => {});
      }

      return response.ok;
    } catch (error) {
      console.log('[ProgressPhotoGallery] Remote photo delete failed:', error);
      return false;
    }
  };

  const addPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add progress photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    await saveSelectedPhoto(result.assets[0].uri);
  };

  const addPhotoFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to capture progress photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    await saveSelectedPhoto(result.assets[0].uri);
  };

  const removePhoto = async (photoId: string) => {
    const photo = photos.find((item) => item.id === photoId);
    if (photo && !photo.isLocalOnly) {
      const deleted = await deleteRemotePhoto(photoId);
      if (!deleted) {
        Alert.alert('Error', 'Could not delete this photo from your account. Please try again.');
        return;
      }
    }

    await persistPhotos(photos.filter((photo) => photo.id !== photoId));
  };

  const renderCompareFrame = (large = false) => {
    if (!beforePhoto || !afterPhoto) return null;

    return (
      <View
        style={[styles.compareFrame, large && styles.compareFrameLarge]}
        onLayout={(event) => setCompareWidth(Math.max(1, event.nativeEvent.layout.width))}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: beforePhoto.uri }} style={styles.compareImage} resizeMode="cover" />
        <View style={[styles.compareOverlay, { width: `${compareRatio * 100}%` }]}>
          <Image
            source={{ uri: afterPhoto.uri }}
            style={[styles.compareOverlayImage, { width: compareWidth }]}
            resizeMode="cover"
          />
        </View>
        <View style={[styles.compareDivider, { left: `${compareRatio * 100}%` }]}>
          <View style={styles.compareKnob}>
            <Ionicons name="swap-horizontal" size={Math.min(hp(2.1), wp(4.8))} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.compareLabels}>
          <Text style={styles.compareLabel}>Before</Text>
          <Text style={styles.compareLabel}>After</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.sectionTitle}>Progress Photo Gallery</Text>
          <Text style={styles.subtitle}>Track body changes with private, dated photos.</Text>
        </View>
        <View style={styles.privatePill}>
          <Ionicons name="lock-closed-outline" size={Math.min(hp(1.75), wp(3.9))} color={colors.primary} />
          <Text style={styles.privateText}>Private</Text>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark-outline" size={Math.min(hp(2.4), wp(5.3))} color={colors.primary} />
        <Text style={styles.privacyText}>
          Photos are saved privately on this device and synced to your account when available.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <AnimatedPressable style={styles.primaryButton} onPress={addPhotoFromLibrary}>
          <Ionicons name="images-outline" size={Math.min(hp(2.15), wp(4.8))} color={colors.textOnPrimary} />
          <Text style={styles.primaryButtonText}>Add Photo</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.secondaryButton} onPress={addPhotoFromCamera}>
          <Ionicons name="camera-outline" size={Math.min(hp(2.15), wp(4.8))} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Camera</Text>
        </AnimatedPressable>
      </View>

      {isLoading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="body-outline" size={Math.min(hp(4), wp(8.8))} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No progress photos yet</Text>
          <Text style={styles.emptyText}>Add your first photo today, then compare it with future updates.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
            {orderedPhotos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} resizeMode="cover" />
                <View style={styles.photoMetaRow}>
                  <View style={styles.photoDateWrap}>
                    <Ionicons name="calendar-outline" size={Math.min(hp(1.55), wp(3.5))} color={colors.textSecondary} />
                    <Text style={styles.photoDate} numberOfLines={1}>{formatDateLabel(photo.createdAt)}</Text>
                  </View>
                  <AnimatedPressable style={styles.deleteButton} onPress={() => removePhoto(photo.id)}>
                    <Ionicons name="trash-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.error} />
                  </AnimatedPressable>
                </View>
              </View>
            ))}
          </ScrollView>

          {beforePhoto && afterPhoto && beforePhoto.id !== afterPhoto.id ? (
            <View style={styles.compareCard}>
              <View style={styles.compareCardHeader}>
                <View>
                  <Text style={styles.compareTitle}>Before / After</Text>
                  <Text style={styles.compareSubtitle}>
                    {formatDateLabel(beforePhoto.createdAt)} to {formatDateLabel(afterPhoto.createdAt)}
                  </Text>
                </View>
                <AnimatedPressable style={styles.compareOpenButton} onPress={() => setCompareVisible(true)}>
                  <Ionicons name="resize-outline" size={Math.min(hp(1.9), wp(4.2))} color={colors.primary} />
                  <Text style={styles.compareOpenText}>Compare</Text>
                </AnimatedPressable>
              </View>
              {renderCompareFrame()}
            </View>
          ) : null}
        </>
      )}

      <Modal visible={compareVisible} transparent animationType="fade" onRequestClose={() => setCompareVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Private Comparison</Text>
                <Text style={styles.modalSubtitle}>Drag the slider to compare progress.</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setCompareVisible(false)}>
                <Ionicons name="close" size={Math.min(hp(2.5), wp(5.6))} color={colors.textPrimary} />
              </Pressable>
            </View>
            {renderCompareFrame(true)}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  section: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.4),
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: hp(2.2),
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: hp(1.35),
    fontWeight: '700',
    lineHeight: hp(1.9),
    marginTop: hp(0.2),
  },
  privatePill: {
    minHeight: hp(3.4),
    borderRadius: hp(1.7),
    paddingHorizontal: wp(2.7),
    backgroundColor: `${colors.primary}14`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  privateText: {
    color: colors.primary,
    fontSize: hp(1.25),
    fontWeight: '900',
  },
  privacyCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    borderRadius: hp(1.5),
    padding: hp(1.4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.4),
    marginBottom: hp(1.3),
  },
  privacyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: hp(1.28),
    fontWeight: '700',
    lineHeight: hp(1.85),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginBottom: hp(1.4),
  },
  primaryButton: {
    flex: 1,
    minHeight: hp(4.8),
    borderRadius: hp(1.5),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: hp(1.45),
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    minHeight: hp(4.8),
    borderRadius: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: hp(1.45),
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: hp(17),
    borderRadius: hp(1.7),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(2),
  },
  emptyIcon: {
    width: Math.min(hp(6.2), wp(13.5)),
    height: Math.min(hp(6.2), wp(13.5)),
    borderRadius: Math.min(hp(3.1), wp(6.75)),
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.7),
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: hp(1.3),
    fontWeight: '700',
    lineHeight: hp(1.85),
    textAlign: 'center',
    marginTop: hp(0.5),
  },
  photoList: {
    gap: wp(3),
    paddingRight: wp(2),
  },
  photoCard: {
    width: wp(37),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: hp(17),
    backgroundColor: colors.border,
  },
  photoMetaRow: {
    minHeight: hp(4.4),
    paddingHorizontal: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(1),
  },
  photoDateWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  photoDate: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: hp(1.08),
    fontWeight: '800',
  },
  deleteButton: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.error}12`,
  },
  compareCard: {
    marginTop: hp(1.5),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.7),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.4),
  },
  compareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.1),
  },
  compareTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.65),
    fontWeight: '900',
  },
  compareSubtitle: {
    color: colors.textSecondary,
    fontSize: hp(1.12),
    fontWeight: '700',
    marginTop: hp(0.2),
  },
  compareOpenButton: {
    minHeight: hp(3.6),
    borderRadius: hp(1.8),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: `${colors.primary}12`,
  },
  compareOpenText: {
    color: colors.primary,
    fontSize: hp(1.2),
    fontWeight: '900',
  },
  compareFrame: {
    height: hp(27),
    borderRadius: hp(1.4),
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  compareFrameLarge: {
    height: hp(52),
  },
  compareImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  compareOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  compareOverlayImage: {
    height: '100%',
  },
  compareDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.textOnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareKnob: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.textOnPrimary,
  },
  compareLabels: {
    position: 'absolute',
    left: wp(2),
    right: wp(2),
    bottom: hp(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compareLabel: {
    color: colors.textOnPrimary,
    fontSize: hp(1.15),
    fontWeight: '900',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(1.6),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.3),
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: hp(2),
    fontWeight: '900',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: hp(1.25),
    fontWeight: '700',
    marginTop: hp(0.2),
  },
  modalClose: {
    width: hp(4.2),
    height: hp(4.2),
    borderRadius: hp(2.1),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface || colors.screenColor,
  },
});

export default ProgressPhotoGallery;
