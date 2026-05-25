import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getCurrentAccountStorageIdentity } from './auth/accountScopedStorage';
import type { LocalSyncCategory } from './localSyncFile';

const BACKUP_HISTORY_KEY_PREFIX = 'fitfaat_backup_history_v1:';
const MAX_BACKUP_HISTORY_ITEMS = 30;

export type BackupHistoryAction = 'export' | 'import' | 'test';
export type BackupHistoryStatus = 'success' | 'failed';

export type BackupHistoryRecord = {
  id: string;
  accountIdentity: string | null;
  maskedAccountIdentity?: string | null;
  action: BackupHistoryAction;
  status: BackupHistoryStatus;
  verificationStatus?: 'untested' | 'verified' | 'failed';
  verifiedAt?: string;
  secureHistory?: boolean;
  createdAt: string;
  fileName?: string;
  fileUri?: string;
  exportedAt?: string;
  itemCount?: number;
  assetCount?: number;
  categories?: LocalSyncCategory[];
  message?: string;
};

const getHistoryKey = async () => {
  const identity = await getCurrentAccountStorageIdentity();
  return `${BACKUP_HISTORY_KEY_PREFIX}${encodeURIComponent(identity || 'anonymous')}`;
};

const createHistoryId = () =>
  `backup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const maskIdentity = (identity?: string | null) => {
  if (!identity) return null;
  if (identity.includes('@')) {
    const [name, domain] = identity.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${identity.slice(0, 4)}***${identity.slice(-3)}`;
};

const readStoredHistoryValue = async (key: string) => {
  try {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) return { value: secureValue, secureHistory: true };
  } catch {
    // Fall through to AsyncStorage for platforms or builds without SecureStore support.
  }

  return {
    value: await AsyncStorage.getItem(key),
    secureHistory: false,
  };
};

const writeStoredHistoryValue = async (key: string, value: string) => {
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key).catch(() => {});
    return true;
  } catch {
    await AsyncStorage.setItem(key, value);
    return false;
  }
};

export const loadBackupHistory = async (): Promise<BackupHistoryRecord[]> => {
  try {
    const key = await getHistoryKey();
    const { value: rawValue, secureHistory } = await readStoredHistoryValue(key);
    const parsed = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((record): record is BackupHistoryRecord =>
        record &&
        typeof record.id === 'string' &&
        typeof record.action === 'string' &&
        typeof record.status === 'string' &&
        typeof record.createdAt === 'string'
      )
      .map((record) => ({
        ...record,
        maskedAccountIdentity: record.maskedAccountIdentity || maskIdentity(record.accountIdentity),
        secureHistory: record.secureHistory ?? secureHistory,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_BACKUP_HISTORY_ITEMS);
  } catch {
    return [];
  }
};

export const addBackupHistoryRecord = async (
  record: Omit<BackupHistoryRecord, 'id' | 'accountIdentity' | 'createdAt'> & {
    createdAt?: string;
  }
) => {
  const identity = await getCurrentAccountStorageIdentity();
  const key = await getHistoryKey();
  const currentHistory = await loadBackupHistory();
  const nextRecord: BackupHistoryRecord = {
    id: createHistoryId(),
    accountIdentity: identity,
    maskedAccountIdentity: maskIdentity(identity),
    createdAt: record.createdAt || new Date().toISOString(),
    ...record,
  };

  const nextHistory = [nextRecord, ...currentHistory]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_BACKUP_HISTORY_ITEMS);

  const secureHistory = await writeStoredHistoryValue(key, JSON.stringify(nextHistory));
  return { ...nextRecord, secureHistory };
};

export const clearBackupHistory = async () => {
  const key = await getHistoryKey();
  await Promise.all([
    AsyncStorage.removeItem(key).catch(() => {}),
    SecureStore.deleteItemAsync(key).catch(() => {}),
  ]);
};
