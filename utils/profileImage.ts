const GOOGLE_IMAGE_HOST_PATTERN = /^https?:\/\/[^/]*(googleusercontent\.com|ggpht\.com)\//i;

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
