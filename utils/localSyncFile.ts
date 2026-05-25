import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  buildAccountScopedStorageExport,
  getCurrentAccountStorageIdentity,
  restoreAccountScopedStorageItems,
  type AccountScopedStorageExportItem,
} from './auth/accountScopedStorage';
import { addBackupHistoryRecord } from './localBackupHistory';
import { localSyncEvents } from './localSyncEvents';
import {
  DASHBOARD_CACHE_KEY_PREFIX,
  LEGACY_DASHBOARD_CACHE_KEY,
  LEGACY_WEEKLY_TRACKING_ID_KEY,
  WEEKLY_TRACKING_ID_KEY_PREFIX,
} from './dashboardStorage';

const BACKUP_KIND = 'fitfaat-local-sync';
const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_EXTENSION = '.ffsync';
const BACKUP_MIME_TYPE = 'application/octet-stream';
const ENCRYPTION_VERSION_V1 = 'fitfaat-passcode-sha256-stream-v1';
const ENCRYPTION_VERSION_V2 = 'fitfaat-account-passcode-sha256-stream-v2';
const ENCRYPTION_VERSION = ENCRYPTION_VERSION_V2;
const UTF8 = FileSystem.EncodingType.UTF8;
const BASE64 = FileSystem.EncodingType.Base64;
const PROGRESS_PHOTO_STORAGE_PREFIX = 'fitfaat_progress_photos:';
const PROGRESS_PHOTO_DIRECTORY = `${FileSystem.documentDirectory || ''}progress-photos/`;

export type LocalSyncCategory =
  | 'meals'
  | 'steps'
  | 'workouts'
  | 'weight'
  | 'progressPhotos'
  | 'settings';

export type LocalSyncCategoryOption = {
  key: LocalSyncCategory;
  label: string;
  description: string;
};

export const LOCAL_SYNC_CATEGORY_OPTIONS: LocalSyncCategoryOption[] = [
  {
    key: 'meals',
    label: 'Meals',
    description: 'Meal logs, nutrition profile, meal plans, grocery lists, and diet preferences',
  },
  {
    key: 'steps',
    label: 'Steps',
    description: 'Step history, step goal, walking calories, and dashboard step progress',
  },
  {
    key: 'workouts',
    label: 'Workouts',
    description: 'Workout history, exercise progress, favorites, and activity heatmap data',
  },
  {
    key: 'weight',
    label: 'Weight',
    description: 'Health metrics, weight logs, adaptive targets, and dashboard health progress',
  },
  {
    key: 'progressPhotos',
    label: 'Progress Photos',
    description: 'Progress photo metadata and embedded local photo files',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'App preferences, privacy settings, notifications, notes, badges, and local app state',
  },
];

export const DEFAULT_LOCAL_SYNC_CATEGORIES = LOCAL_SYNC_CATEGORY_OPTIONS.map(
  (category) => category.key
);

export type LocalSyncOptions = {
  categories?: LocalSyncCategory[];
};

export type LocalSyncCategoryCounts = Record<LocalSyncCategory, number>;

export type LocalSyncBackupPreview = {
  fileUri?: string;
  fileName?: string;
  exportedAt: string;
  userIdentity?: string | null;
  itemCount: number;
  assetCount: number;
  categories: LocalSyncCategory[];
  categoryCounts: LocalSyncCategoryCounts;
  missingProgressPhotoAssets: number;
};

export type LocalSyncPreparedImport = {
  candidateUri: string;
  payload: LocalSyncPayload;
  preview: LocalSyncBackupPreview;
};

type LocalSyncPhotoAsset = {
  id: string;
  storageKey: string;
  photoId: string;
  originalUri: string;
  fileName: string;
  mimeType: string;
  data: string;
};

type LocalSyncPayload = {
  schemaVersion: 1;
  app: 'FitFaat';
  exportedAt: string;
  userIdentity?: string | null;
  categories?: LocalSyncCategory[];
  items: AccountScopedStorageExportItem[];
  assets?: LocalSyncPhotoAsset[];
};

type LocalSyncEnvelope = {
  schemaVersion: 1;
  kind: typeof BACKUP_KIND;
  app: 'FitFaat';
  exportedAt: string;
  encrypted: true;
  encryption: typeof ENCRYPTION_VERSION_V1 | typeof ENCRYPTION_VERSION_V2;
  salt: string;
  checksum: string;
  data: string;
};

type BackupCandidate = {
  uri: string;
  raw: string;
  exportedAt: string;
};

const DASHBOARD_PROGRESS_KEYS = [LEGACY_WEEKLY_TRACKING_ID_KEY, LEGACY_DASHBOARD_CACHE_KEY];

const CATEGORY_RULES: Record<LocalSyncCategory, { keys: string[]; prefixes: string[] }> = {
  meals: {
    keys: [
      'fitfaat_diet_preference',
      'fitfaat_meal_templates',
      'fitfaat_meal_plans',
      'fitfaat_grocery_lists',
      'fitfaat_nutrition_reports_v1',
      'fitfaat_weekly_scores_v1',
      'fitfaat_habit_missions_v1',
      'fitfaat_behavior_checkins_v1',
      'fitfaat_craving_logs_v1',
    ],
    prefixes: [
      'fitfaat_nutrition_profile_entries:',
      'fitfaat_nutrition_profile_notifications:',
    ],
  },
  steps: {
    keys: [
      'fitfaat_step_counter_history',
      'fitfaat_step_counter_goal',
      'fitfaat_step_counter_permission',
    ],
    prefixes: [],
  },
  workouts: {
    keys: [
      'favoriteExercises',
      'completedWorkouts',
      'fitfaat_completed_workouts',
      'fitfaat_local_exercise_progress',
    ],
    prefixes: [],
  },
  weight: {
    keys: [
      'fitfaat_health_sync_snapshot',
      'fitfaat_health_metrics',
      'fitfaat_weight_logs',
      'fitfaat_early_logs',
      'fitfaat_adaptive_goal_carry_forward',
      'fitfaat_nutrition_reports_v1',
      'fitfaat_weekly_scores_v1',
    ],
    prefixes: [WEEKLY_TRACKING_ID_KEY_PREFIX, DASHBOARD_CACHE_KEY_PREFIX],
  },
  progressPhotos: {
    keys: [],
    prefixes: [PROGRESS_PHOTO_STORAGE_PREFIX],
  },
  settings: {
    keys: [
      'chatbot_sessions',
      'fitfaat_goal_display_mode',
      'fitfaat_activity_heatmap_snapshots',
      'fitfaat_breathing_sessions',
      'fitfaat_notes',
      'fitfaat_read_news',
      'notification_settings',
      'privacySettings',
      'fitfaat_unlocked_badges',
      'fitfaat_habit_missions_v1',
      'fitfaat_behavior_checkins_v1',
      'fitfaat_mini_lessons_seen_v1',
      'fitfaat_craving_logs_v1',
      'fitfaat_habit_preferences_v1',
    ],
    prefixes: [
      'dashboardMood:',
      'fitfaat_end_day_recap_seen:',
    ],
  },
};

const emptyCategoryCounts = (): LocalSyncCategoryCounts =>
  DEFAULT_LOCAL_SYNC_CATEGORIES.reduce((counts, category) => {
    counts[category] = 0;
    return counts;
  }, {} as LocalSyncCategoryCounts);

const normalizeCategories = (categories?: LocalSyncCategory[]) => {
  const allowedCategories = new Set(DEFAULT_LOCAL_SYNC_CATEGORIES);
  const normalized = Array.from(
    new Set(
      (categories?.length ? categories : DEFAULT_LOCAL_SYNC_CATEGORIES)
        .filter((category): category is LocalSyncCategory => allowedCategories.has(category))
    )
  );

  if (!normalized.length) {
    throw new Error('Choose at least one backup category.');
  }

  return normalized;
};

const getRequiredCurrentUserIdentity = async () => {
  const identity = await getCurrentAccountStorageIdentity();
  if (!identity) {
    throw new Error('Sign in to your FitFaat account before using backup files.');
  }

  return identity;
};

const getAccountBoundPasscode = (passcode: string, userIdentity: string) =>
  JSON.stringify([ENCRYPTION_VERSION_V2, userIdentity, passcode]);

const assertPayloadMatchesCurrentAccount = (
  payload: LocalSyncPayload,
  currentUserIdentity: string
) => {
  if (!payload.userIdentity) {
    throw new Error('This backup is not linked to a FitFaat account and cannot be restored securely.');
  }

  if (payload.userIdentity !== currentUserIdentity) {
    throw new Error('This backup belongs to a different FitFaat account. Sign in to that account to preview or restore it.');
  }
};

const getItemCategories = (key: string): LocalSyncCategory[] => {
  const categories: LocalSyncCategory[] = [];

  if (DASHBOARD_PROGRESS_KEYS.includes(key)) {
    categories.push('meals', 'steps', 'workouts', 'weight');
  }

  DEFAULT_LOCAL_SYNC_CATEGORIES.forEach((category) => {
    const rule = CATEGORY_RULES[category];
    if (
      rule.keys.includes(key) ||
      rule.prefixes.some((prefix) => key.startsWith(prefix))
    ) {
      categories.push(category);
    }
  });

  return Array.from(new Set(categories.length ? categories : ['settings']));
};

const filterItemsByCategories = (
  items: AccountScopedStorageExportItem[],
  categories?: LocalSyncCategory[]
) => {
  const selectedCategories = normalizeCategories(categories);
  const selectedSet = new Set(selectedCategories);

  return items.filter((item) =>
    item?.key && getItemCategories(item.key).some((category) => selectedSet.has(category))
  );
};

const getBackupCategoryCounts = (
  items: AccountScopedStorageExportItem[],
  assets: LocalSyncPhotoAsset[] = []
) => {
  const counts = emptyCategoryCounts();

  items.forEach((item) => {
    getItemCategories(item.key).forEach((category) => {
      counts[category] += 1;
    });
  });

  counts.progressPhotos += assets.length;
  return counts;
};

const getBackupCategories = (
  items: AccountScopedStorageExportItem[],
  assets: LocalSyncPhotoAsset[] = []
) => {
  const counts = getBackupCategoryCounts(items, assets);
  return DEFAULT_LOCAL_SYNC_CATEGORIES.filter((category) => counts[category] > 0);
};

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rightRotate = (value: number, bits: number) =>
  (value >>> bits) | (value << (32 - bits));

const encodeUtf8 = (value: string) => {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }

  return bytes;
};

const decodeUtf8 = (bytes: number[]) => {
  let output = '';

  for (let index = 0; index < bytes.length;) {
    const byte = bytes[index];
    let codePoint = byte;

    if (byte >= 0xf0) {
      codePoint =
        ((byte & 0x07) << 18) |
        ((bytes[index + 1] & 0x3f) << 12) |
        ((bytes[index + 2] & 0x3f) << 6) |
        (bytes[index + 3] & 0x3f);
      index += 4;
    } else if (byte >= 0xe0) {
      codePoint =
        ((byte & 0x0f) << 12) |
        ((bytes[index + 1] & 0x3f) << 6) |
        (bytes[index + 2] & 0x3f);
      index += 3;
    } else if (byte >= 0xc0) {
      codePoint = ((byte & 0x1f) << 6) | (bytes[index + 1] & 0x3f);
      index += 2;
    } else {
      index += 1;
    }

    if (codePoint > 0xffff) {
      codePoint -= 0x10000;
      output += String.fromCharCode(
        0xd800 + (codePoint >> 10),
        0xdc00 + (codePoint & 0x3ff)
      );
    } else {
      output += String.fromCharCode(codePoint);
    }
  }

  return output;
};

const sha256 = (bytes: number[]) => {
  const data = bytes.slice();
  const bitLength = data.length * 8;
  const words = new Array(64).fill(0);
  let hash0 = 0x6a09e667;
  let hash1 = 0xbb67ae85;
  let hash2 = 0x3c6ef372;
  let hash3 = 0xa54ff53a;
  let hash4 = 0x510e527f;
  let hash5 = 0x9b05688c;
  let hash6 = 0x1f83d9ab;
  let hash7 = 0x5be0cd19;

  data.push(0x80);
  while ((data.length % 64) !== 56) data.push(0);

  const highLength = Math.floor(bitLength / 0x100000000);
  const lowLength = bitLength >>> 0;
  data.push(
    (highLength >>> 24) & 0xff,
    (highLength >>> 16) & 0xff,
    (highLength >>> 8) & 0xff,
    highLength & 0xff,
    (lowLength >>> 24) & 0xff,
    (lowLength >>> 16) & 0xff,
    (lowLength >>> 8) & 0xff,
    lowLength & 0xff
  );

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const byteIndex = offset + index * 4;
      words[index] =
        ((data[byteIndex] << 24) |
          (data[byteIndex + 1] << 16) |
          (data[byteIndex + 2] << 8) |
          data[byteIndex + 3]) >>> 0;
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rightRotate(words[index - 15], 7) ^
        rightRotate(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rightRotate(words[index - 2], 17) ^
        rightRotate(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = hash0;
    let b = hash1;
    let c = hash2;
    let d = hash3;
    let e = hash4;
    let f = hash5;
    let g = hash6;
    let h = hash7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash0 = (hash0 + a) >>> 0;
    hash1 = (hash1 + b) >>> 0;
    hash2 = (hash2 + c) >>> 0;
    hash3 = (hash3 + d) >>> 0;
    hash4 = (hash4 + e) >>> 0;
    hash5 = (hash5 + f) >>> 0;
    hash6 = (hash6 + g) >>> 0;
    hash7 = (hash7 + h) >>> 0;
  }

  return [hash0, hash1, hash2, hash3, hash4, hash5, hash6, hash7].flatMap((word) => [
    (word >>> 24) & 0xff,
    (word >>> 16) & 0xff,
    (word >>> 8) & 0xff,
    word & 0xff,
  ]);
};

const bytesToHex = (bytes: number[]) =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string) => {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
};

const getCounterBytes = (counter: number) => [
  (counter >>> 24) & 0xff,
  (counter >>> 16) & 0xff,
  (counter >>> 8) & 0xff,
  counter & 0xff,
];

const xorWithPasscodeStream = (bytes: number[], passcode: string, saltHex: string) => {
  const output = new Array(bytes.length);
  const passcodeBytes = encodeUtf8(passcode);
  const saltBytes = hexToBytes(saltHex);
  let counter = 0;
  let offset = 0;

  while (offset < bytes.length) {
    const streamBlock = sha256([...saltBytes, ...passcodeBytes, ...getCounterBytes(counter)]);
    counter += 1;

    for (let index = 0; index < streamBlock.length && offset < bytes.length; index += 1) {
      output[offset] = bytes[offset] ^ streamBlock[index];
      offset += 1;
    }
  }

  return output;
};

const createSaltHex = () =>
  bytesToHex(
    sha256(encodeUtf8(`${Date.now()}:${Math.random()}:${Math.random()}`))
  ).slice(0, 32);

const isLocalDeviceUri = (uri?: string | null) => !!uri && /^(file|content|ph):/i.test(uri);

const getImageFileInfo = (uri: string) => {
  const cleanUri = uri.split('?')[0].split('#')[0];
  const rawExtension = cleanUri.includes('.') ? cleanUri.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const extension = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExtension) ? rawExtension : 'jpg';
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const mimeType =
    normalizedExtension === 'jpg'
      ? 'image/jpeg'
      : normalizedExtension === 'heic'
        ? 'image/heic'
        : `image/${normalizedExtension}`;

  return { extension: normalizedExtension, mimeType };
};

const sanitizeFileSegment = (value: string) =>
  value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'photo';

const ensureProgressPhotoDirectory = async () => {
  if (!FileSystem.documentDirectory) return null;

  const directoryInfo = await FileSystem.getInfoAsync(PROGRESS_PHOTO_DIRECTORY);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(PROGRESS_PHOTO_DIRECTORY, { intermediates: true });
  }

  return PROGRESS_PHOTO_DIRECTORY;
};

const canReadLocalPhoto = async (uri: string) => {
  if (!uri.startsWith('file:')) return true;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists;
  } catch {
    return false;
  }
};

const buildProgressPhotoAssets = async (items: AccountScopedStorageExportItem[]) => {
  const assets: LocalSyncPhotoAsset[] = [];

  for (const item of items) {
    if (!item.key.startsWith(PROGRESS_PHOTO_STORAGE_PREFIX)) continue;

    try {
      const photos = JSON.parse(item.value);
      if (!Array.isArray(photos)) continue;

      for (const photo of photos) {
        const photoId = String(photo?.id || '');
        const uri = typeof photo?.uri === 'string' ? photo.uri : '';
        if (!photoId || !isLocalDeviceUri(uri) || !(await canReadLocalPhoto(uri))) continue;

        try {
          const { extension, mimeType } = getImageFileInfo(uri);
          const data = await FileSystem.readAsStringAsync(uri, { encoding: BASE64 });
          const assetId = `${sanitizeFileSegment(item.key)}-${sanitizeFileSegment(photoId)}`;

          assets.push({
            id: assetId,
            storageKey: item.key,
            photoId,
            originalUri: uri,
            fileName: `${assetId}.${extension}`,
            mimeType,
            data,
          });
        } catch {
          // If a local photo is no longer readable, export the metadata but skip the missing file.
        }
      }
    } catch {
      // Ignore malformed progress photo entries.
    }
  }

  return assets;
};

const getMissingProgressPhotoAssetCount = (
  items: AccountScopedStorageExportItem[],
  assets: LocalSyncPhotoAsset[] = []
) => {
  const assetKeys = new Set(
    assets
      .filter((asset) => asset?.storageKey && asset?.photoId)
      .map((asset) => `${asset.storageKey}:${asset.photoId}`)
  );
  let missingCount = 0;

  for (const item of items) {
    if (!item.key.startsWith(PROGRESS_PHOTO_STORAGE_PREFIX)) continue;

    try {
      const photos = JSON.parse(item.value);
      if (!Array.isArray(photos)) continue;

      photos.forEach((photo) => {
        const photoId = String(photo?.id || '');
        const uri = typeof photo?.uri === 'string' ? photo.uri : '';
        if (photoId && isLocalDeviceUri(uri) && !assetKeys.has(`${item.key}:${photoId}`)) {
          missingCount += 1;
        }
      });
    } catch {
      // Malformed metadata will be skipped during restore too.
    }
  }

  return missingCount;
};

const getFileNameFromUri = (uri?: string | null) => {
  if (!uri) return undefined;
  const cleanUri = decodeURIComponent(uri.split('?')[0].split('#')[0]);
  const parts = cleanUri.split(/[\\/]/);
  return parts[parts.length - 1] || undefined;
};

const buildBackupPreview = (
  payload: LocalSyncPayload,
  fileUri?: string
): LocalSyncBackupPreview => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const assets = Array.isArray(payload.assets) ? payload.assets : [];
  const categories = payload.categories?.length
    ? payload.categories
    : getBackupCategories(items, assets);

  return {
    fileUri,
    fileName: getFileNameFromUri(fileUri),
    exportedAt: payload.exportedAt,
    userIdentity: payload.userIdentity,
    itemCount: items.length,
    assetCount: assets.length,
    categories,
    categoryCounts: getBackupCategoryCounts(items, assets),
    missingProgressPhotoAssets: getMissingProgressPhotoAssetCount(items, assets),
  };
};

const writeImportedProgressPhotoAsset = async (asset: LocalSyncPhotoAsset) => {
  const directory = await ensureProgressPhotoDirectory();
  if (!directory || !asset.data) return null;

  const { extension } = getImageFileInfo(asset.fileName || asset.originalUri || 'photo.jpg');
  const fileName = `${Date.now()}-${sanitizeFileSegment(asset.id || asset.photoId)}.${extension}`;
  const fileUri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, asset.data, { encoding: BASE64 });
  return fileUri;
};

const restoreProgressPhotoAssets = async (
  items: AccountScopedStorageExportItem[],
  assets: LocalSyncPhotoAsset[] = []
) => {
  if (!items.length) return items;

  const assetByPhoto = new Map<string, LocalSyncPhotoAsset>();
  assets.forEach((asset) => {
    if (asset?.storageKey && asset?.photoId) {
      assetByPhoto.set(`${asset.storageKey}:${asset.photoId}`, asset);
    }
  });

  const nextItems: AccountScopedStorageExportItem[] = [];

  for (const item of items) {
    if (!item.key.startsWith(PROGRESS_PHOTO_STORAGE_PREFIX)) {
      nextItems.push(item);
      continue;
    }

    try {
      const photos = JSON.parse(item.value);
      if (!Array.isArray(photos)) {
        nextItems.push(item);
        continue;
      }

      const restoredPhotos = [];

      for (const photo of photos) {
        if (!photo?.uri || !photo?.createdAt) continue;

        const photoId = String(photo.id || '');
        const asset = assetByPhoto.get(`${item.key}:${photoId}`);

        if (asset) {
          const importedUri = await writeImportedProgressPhotoAsset(asset);
          if (importedUri) {
            restoredPhotos.push({
              ...photo,
              uri: importedUri,
              isLocalOnly: true,
            });
            continue;
          }
        }

        if (isLocalDeviceUri(photo.uri) && !(await canReadLocalPhoto(photo.uri))) {
          continue;
        }

        restoredPhotos.push(photo);
      }

      nextItems.push({
        ...item,
        value: JSON.stringify(restoredPhotos),
      });
    } catch {
      nextItems.push(item);
    }
  }

  return nextItems;
};

const encryptPayload = (
  payload: LocalSyncPayload,
  passcode: string,
  userIdentity: string
): LocalSyncEnvelope => {
  const plainBytes = encodeUtf8(JSON.stringify(payload));
  const salt = createSaltHex();
  const accountBoundPasscode = getAccountBoundPasscode(passcode, userIdentity);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    kind: BACKUP_KIND,
    app: 'FitFaat',
    exportedAt: payload.exportedAt,
    encrypted: true,
    encryption: ENCRYPTION_VERSION,
    salt,
    checksum: bytesToHex(sha256(plainBytes)),
    data: bytesToHex(xorWithPasscodeStream(plainBytes, accountBoundPasscode, salt)),
  };
};

const decryptEnvelope = (
  raw: string,
  passcode: string,
  currentUserIdentity: string
): LocalSyncPayload => {
  const envelope = JSON.parse(raw) as LocalSyncEnvelope;
  const isKnownEncryption =
    envelope.encryption === ENCRYPTION_VERSION_V1 ||
    envelope.encryption === ENCRYPTION_VERSION_V2;

  if (
    envelope?.kind !== BACKUP_KIND ||
    envelope.schemaVersion !== BACKUP_SCHEMA_VERSION ||
    !isKnownEncryption ||
    typeof envelope.data !== 'string' ||
    typeof envelope.salt !== 'string'
  ) {
    throw new Error('This is not a valid FitFaat sync file.');
  }

  const passcodeKey =
    envelope.encryption === ENCRYPTION_VERSION_V2
      ? getAccountBoundPasscode(passcode, currentUserIdentity)
      : passcode;
  const plainBytes = xorWithPasscodeStream(hexToBytes(envelope.data), passcodeKey, envelope.salt);
  const checksum = bytesToHex(sha256(plainBytes));
  if (checksum !== envelope.checksum) {
    throw new Error(
      envelope.encryption === ENCRYPTION_VERSION_V2
        ? 'The sync passcode is incorrect, this backup belongs to another account, or the file is damaged.'
        : 'The sync passcode is incorrect, or the file is damaged.'
    );
  }

  const payload = JSON.parse(decodeUtf8(plainBytes)) as LocalSyncPayload;
  if (!Array.isArray(payload.items)) {
    throw new Error('This FitFaat sync file does not contain restorable data.');
  }

  assertPayloadMatchesCurrentAccount(payload, currentUserIdentity);

  return payload;
};

const getBackupFileName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `fitfaat-sync-${timestamp}${BACKUP_EXTENSION}`;
};

const writeBackupFile = async (fileName: string, contents: string) => {
  if (Platform.OS === 'android') {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('Choose a folder to save your FitFaat sync file.');
    }

    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      BACKUP_MIME_TYPE
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, contents, { encoding: UTF8 });
    return uri;
  }

  if (!FileSystem.documentDirectory) {
    throw new Error('File export is unavailable on this device.');
  }

  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: UTF8 });
  return uri;
};

const getBackupCandidatesFromDirectory = async (
  directoryUri: string,
  androidSaf: boolean,
  depth = 0
) => {
  const fileUris = androidSaf
    ? await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri)
    : (await FileSystem.readDirectoryAsync(directoryUri)).map((fileName) => `${directoryUri}${fileName}`);
  const candidates: BackupCandidate[] = [];

  for (const uri of fileUris) {
    const normalizedUri = decodeURIComponent(uri).toLowerCase();

    if (normalizedUri.includes(BACKUP_EXTENSION)) {
      try {
        const raw = androidSaf
          ? await FileSystem.StorageAccessFramework.readAsStringAsync(uri, { encoding: UTF8 })
          : await FileSystem.readAsStringAsync(uri, { encoding: UTF8 });
        const parsed = JSON.parse(raw) as Partial<LocalSyncEnvelope>;
        if (parsed.kind === BACKUP_KIND && parsed.exportedAt) {
          candidates.push({ uri, raw, exportedAt: parsed.exportedAt });
        }
      } catch {
        // Ignore unrelated or unreadable files in the selected folder.
      }
    } else if (depth < 2) {
      try {
        candidates.push(...await getBackupCandidatesFromDirectory(uri, androidSaf, depth + 1));
      } catch {
        // Ignore files or folders the Android picker does not let us inspect.
      }
    }
  }

  return candidates;
};

const getNewestBackupCandidate = async () => {
  let candidates: BackupCandidate[] = [];

  if (Platform.OS === 'android') {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('Choose the folder that contains your FitFaat sync file.');
    }
    candidates = await getBackupCandidatesFromDirectory(permissions.directoryUri, true);
  } else if (FileSystem.documentDirectory) {
    candidates = await getBackupCandidatesFromDirectory(FileSystem.documentDirectory, false);
  }

  if (!candidates.length) {
    throw new Error(
      `No ${BACKUP_EXTENSION} FitFaat sync file was found in the selected folder. Move the exported file into Downloads or a FitFaat Backups folder, then select that folder and tap Use this folder.`
    );
  }

  return candidates.sort(
    (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
  )[0];
};

export const exportLocalSyncFile = async (
  passcode: string,
  options: LocalSyncOptions = {}
) => {
  const selectedCategories = normalizeCategories(options.categories);
  const { userIdentity, items } = await buildAccountScopedStorageExport();
  const currentUserIdentity = await getRequiredCurrentUserIdentity();
  const backupUserIdentity = userIdentity || currentUserIdentity;
  if (backupUserIdentity !== currentUserIdentity) {
    throw new Error('Sign in to the account you want to export before creating a backup.');
  }

  const filteredItems = filterItemsByCategories(items, selectedCategories);
  const assets = selectedCategories.includes('progressPhotos')
    ? await buildProgressPhotoAssets(filteredItems)
    : [];
  const exportedAt = new Date().toISOString();
  const payload: LocalSyncPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    app: 'FitFaat',
    exportedAt,
    userIdentity: backupUserIdentity,
    categories: selectedCategories,
    items: filteredItems,
    assets,
  };
  const fileName = getBackupFileName();
  const envelope = encryptPayload(payload, passcode, backupUserIdentity);
  const uri = await writeBackupFile(fileName, JSON.stringify(envelope));
  const itemCount = filteredItems.length + assets.length;

  await addBackupHistoryRecord({
    action: 'export',
    status: 'success',
    verificationStatus: 'untested',
    fileName,
    fileUri: uri,
    exportedAt,
    itemCount,
    assetCount: assets.length,
    categories: selectedCategories,
  }).catch(() => {});

  return {
    fileName,
    uri,
    itemCount,
    assetCount: assets.length,
    categories: selectedCategories,
    exportedAt,
  };
};

export const prepareLocalSyncImport = async (
  passcode: string
): Promise<LocalSyncPreparedImport> => {
  const candidate = await getNewestBackupCandidate();
  const currentUserIdentity = await getRequiredCurrentUserIdentity();
  const payload = decryptEnvelope(candidate.raw, passcode, currentUserIdentity);

  return {
    candidateUri: candidate.uri,
    payload,
    preview: buildBackupPreview(payload, candidate.uri),
  };
};

export const previewNewestLocalSyncFile = async (passcode: string) => {
  const prepared = await prepareLocalSyncImport(passcode);
  return prepared.preview;
};

export const testNewestLocalSyncFile = async (passcode: string) => {
  try {
    const prepared = await prepareLocalSyncImport(passcode);

    await addBackupHistoryRecord({
      action: 'test',
      status: 'success',
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString(),
      fileName: prepared.preview.fileName,
      fileUri: prepared.candidateUri,
      exportedAt: prepared.preview.exportedAt,
      itemCount: prepared.preview.itemCount + prepared.preview.assetCount,
      assetCount: prepared.preview.assetCount,
      categories: prepared.preview.categories,
      message: prepared.preview.missingProgressPhotoAssets
        ? `${prepared.preview.missingProgressPhotoAssets} progress photo files are missing from this backup.`
        : 'Backup integrity check passed.',
    }).catch(() => {});

    return prepared.preview;
  } catch (error: any) {
    await addBackupHistoryRecord({
      action: 'test',
      status: 'failed',
      verificationStatus: 'failed',
      verifiedAt: new Date().toISOString(),
      message: error?.message || 'Backup integrity check failed.',
    }).catch(() => {});
    throw error;
  }
};

export const applyPreparedLocalSyncImport = async (
  prepared: LocalSyncPreparedImport,
  options: LocalSyncOptions = {}
) => {
  const selectedCategories = normalizeCategories(
    options.categories?.length ? options.categories : prepared.preview.categories
  );
  const filteredItems = filterItemsByCategories(prepared.payload.items, selectedCategories);
  const filteredAssets = selectedCategories.includes('progressPhotos')
    ? prepared.payload.assets || []
    : [];
  const restoredItems = await restoreProgressPhotoAssets(filteredItems, filteredAssets);
  const result = await restoreAccountScopedStorageItems(restoredItems);
  const restoredKeys = Array.from(
    new Set(
      restoredItems
        .map((item) => item?.key)
        .filter((key): key is string => typeof key === 'string')
    )
  );

  localSyncEvents.emitRestore({
    restoredAt: new Date().toISOString(),
    restoredItemCount: result.restoredItemCount,
    restoredKeys,
  });

  await addBackupHistoryRecord({
    action: 'import',
    status: 'success',
    fileName: prepared.preview.fileName,
    fileUri: prepared.candidateUri,
    exportedAt: prepared.payload.exportedAt,
    itemCount: result.restoredItemCount,
    assetCount: filteredAssets.length,
    categories: selectedCategories,
  }).catch(() => {});

  return {
    fileUri: prepared.candidateUri,
    exportedAt: prepared.payload.exportedAt,
    restoredItemCount: result.restoredItemCount,
    restoredKeys,
    categories: selectedCategories,
  };
};

export const importNewestLocalSyncFile = async (
  passcode: string,
  options: LocalSyncOptions = {}
) => {
  const prepared = await prepareLocalSyncImport(passcode);
  return applyPreparedLocalSyncImport(prepared, options);
};
