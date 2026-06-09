import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_IMAGE_HOST_PATTERN = /^https?:\/\/[^/]*(googleusercontent\.com|ggpht\.com)\//i;
const PROFILE_IMAGE_CACHE_PREFIX = 'fitfaat_profile_image_cache';
const PROFILE_IMAGE_VERSION_PARAM = 'fitfaatDpVersion';

const GOOGLE_IMAGE_KEYS = [
  'googlePhotoUrl',
  'googlePhotoURL',
  'googlePhoto',
  'googlePicture',
  'googleProfileImage',
  'googleProfilePicture',
  'photoURL',
  'photoUrl',
  'photo_url',
  'photo',
  'picture',
  'avatar',
  'avatarUrl',
  'avatar_url',
  'image',
  'imageUrl',
  'profilePicture',
  'profilePictureUrl',
  'profileImageUrl',
];

const BACKEND_IMAGE_KEYS = [
  'profileImage',
  'profileImageUrl',
  'profileImagePath',
  'imageUrl',
  'image',
  'avatarUrl',
  'avatar',
  'photoUrl',
  'photo',
  'picture',
];

const getProfileSources = (payload: any): any[] => {
  if (!payload || typeof payload !== 'object') return [];

  return [
    payload,
    payload.user,
    payload.userInfo,
    payload.profile,
    payload.google,
    payload.auth,
    payload.data,
    payload.data?.user,
    payload.data?.userInfo,
    payload.data?.profile,
    Array.isArray(payload.providerData) ? payload.providerData[0] : null,
    Array.isArray(payload.providers) ? payload.providers[0] : null,
  ].filter(Boolean);
};

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const isGoogleImageUrl = (value: string) => GOOGLE_IMAGE_HOST_PATTERN.test(value.trim());

export const getGmailProfileImageUrl = (payload: any): string | null => {
  const sources = getProfileSources(payload);

  for (const source of sources) {
    for (const key of GOOGLE_IMAGE_KEYS) {
      const value = source?.[key];

      if (typeof value !== 'string') continue;

      const imageUrl = value.trim();
      const keyLooksGoogleSpecific = key.toLowerCase().includes('google');

      if (isRemoteUrl(imageUrl) && (keyLooksGoogleSpecific || isGoogleImageUrl(imageUrl))) {
        return imageUrl;
      }
    }
  }

  return null;
};

export const resolveBackendImageUrl = (baseUrl: string, imagePath?: string | null) => {
  if (!imagePath) return null;

  const trimmedBaseUrl = baseUrl.replace(/\/$/, '');
  const trimmedPath = imagePath.trim();

  if (!trimmedPath) return null;
  if (isRemoteUrl(trimmedPath)) return trimmedPath;
  if (trimmedPath.startsWith('/')) return `${trimmedBaseUrl}${trimmedPath}`;

  return `${trimmedBaseUrl}/uploads/profiles/${trimmedPath}`;
};

export const withProfileImageVersion = (
  imageUrl?: string | null,
  version?: string | number | null
) => {
  if (!imageUrl) return null;
  if (/^(file|content|ph):/i.test(imageUrl)) return imageUrl;

  try {
    const parsedUrl = new URL(imageUrl);
    parsedUrl.searchParams.set(PROFILE_IMAGE_VERSION_PARAM, String(version || Date.now()));
    return parsedUrl.toString();
  } catch {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}${PROFILE_IMAGE_VERSION_PARAM}=${encodeURIComponent(String(version || Date.now()))}`;
  }
};

export const withoutProfileImageVersion = (imageUrl?: string | null) => {
  if (!imageUrl) return null;

  try {
    const parsedUrl = new URL(imageUrl);
    parsedUrl.searchParams.delete(PROFILE_IMAGE_VERSION_PARAM);
    return parsedUrl.toString();
  } catch {
    return imageUrl
      .replace(new RegExp(`([?&])${PROFILE_IMAGE_VERSION_PARAM}=[^&]*&?`), '$1')
      .replace(/[?&]$/, '');
  }
};

export const getBackendProfileImageUrl = (baseUrl: string, payload: any): string | null => {
  const sources = getProfileSources(payload);

  for (const source of sources) {
    for (const key of BACKEND_IMAGE_KEYS) {
      const value = source?.[key];
      if (typeof value !== 'string') continue;

      const imageUrl = resolveBackendImageUrl(baseUrl, value);
      if (imageUrl && !isGoogleImageUrl(imageUrl)) {
        return imageUrl;
      }
    }
  }

  return null;
};

export type CachedProfileImage = {
  backendImageUrl: string | null;
  gmailImageUrl: string | null;
  updatedAt: string;
};

const inMemoryProfileImageCache = new Map<string, CachedProfileImage | null>();

export const getProfileImageUserKey = (user: any) => {
  const rawKey = user?._id || user?.id || user?.userId || user?.email || 'current';
  return String(rawKey).trim() || 'current';
};

const getProfileImageCacheKey = (user: any) =>
  `${PROFILE_IMAGE_CACHE_PREFIX}:${getProfileImageUserKey(user)}`;

export const buildStableBackendProfileImageUrl = (
  baseUrl: string,
  imagePath?: string | null,
  cachedImage?: CachedProfileImage | null,
  versionSeed?: string | number | null
) => {
  const resolvedImageUrl = resolveBackendImageUrl(baseUrl, imagePath);
  if (!resolvedImageUrl) return null;

  const cachedBaseUrl = withoutProfileImageVersion(cachedImage?.backendImageUrl);
  const resolvedBaseUrl = withoutProfileImageVersion(resolvedImageUrl);
  const stableVersion =
    cachedBaseUrl &&
    resolvedBaseUrl &&
    cachedBaseUrl === resolvedBaseUrl &&
    cachedImage?.updatedAt
      ? cachedImage.updatedAt
      : versionSeed || new Date().toISOString();

  return withProfileImageVersion(resolvedImageUrl, stableVersion);
};

export const readCachedProfileImage = async (user: any): Promise<CachedProfileImage | null> => {
  const cacheKey = getProfileImageCacheKey(user);

  try {
    if (inMemoryProfileImageCache.has(cacheKey)) {
      return inMemoryProfileImageCache.get(cacheKey) || null;
    }

    const rawValue = await AsyncStorage.getItem(cacheKey);
    if (!rawValue) {
      inMemoryProfileImageCache.set(cacheKey, null);
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const cachedImage = {
      backendImageUrl: typeof parsed?.backendImageUrl === 'string' ? parsed.backendImageUrl : null,
      gmailImageUrl: typeof parsed?.gmailImageUrl === 'string' ? parsed.gmailImageUrl : null,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };

    inMemoryProfileImageCache.set(cacheKey, cachedImage);
    return cachedImage;
  } catch {
    inMemoryProfileImageCache.delete(cacheKey);
    return null;
  }
};

export const writeCachedProfileImage = async (
  user: any,
  image: Partial<Pick<CachedProfileImage, 'backendImageUrl' | 'gmailImageUrl'>>,
  updatedAt = new Date().toISOString()
) => {
  const cacheKey = getProfileImageCacheKey(user);

  try {
    const nextValue: CachedProfileImage = {
      backendImageUrl: image.backendImageUrl || null,
      gmailImageUrl: image.gmailImageUrl || null,
      updatedAt,
    };

    inMemoryProfileImageCache.set(cacheKey, nextValue);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(nextValue));
    return nextValue;
  } catch {
    // Profile images are cosmetic; cache write failures should never block the UI.
    return null;
  }
};

export const clearCachedProfileImage = async (user: any) => {
  const cacheKey = getProfileImageCacheKey(user);

  try {
    inMemoryProfileImageCache.delete(cacheKey);
    await AsyncStorage.removeItem(cacheKey);
  } catch {
    // Ignore cache cleanup failures.
  }
};
