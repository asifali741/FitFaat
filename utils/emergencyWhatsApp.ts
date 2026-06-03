import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/utils/auth/tokenStorage';

export const EMERGENCY_WHATSAPP_STORAGE_PREFIX = 'fitfaat_emergency_whatsapp_contact';

export type EmergencyWhatsAppRecord = {
  number: string;
  updatedAt: string;
};

const getEmergencyContactUserKey = (userData: any) => (
  userData?._id ||
  userData?.id ||
  userData?.userId ||
  userData?.email ||
  'current'
);

const getStoredUser = async (user?: any) => user || await tokenStorage.getUser().catch(() => null);

export const getEmergencyWhatsAppStorageKey = (userData: any) =>
  `${EMERGENCY_WHATSAPP_STORAGE_PREFIX}:${getEmergencyContactUserKey(userData)}`;

export const normalizeWhatsAppNumber = (value: string) => {
  let digits = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  return digits.replace(/\D/g, '');
};

export const formatWhatsAppNumber = (value?: string | null) => {
  if (!value) return 'Not saved';
  if (value.startsWith('92') && value.length === 12) {
    return `0${value.slice(2, 5)} ${value.slice(5, 8)} ${value.slice(8)}`;
  }
  return `+${value}`;
};

export const parseEmergencyWhatsAppRecord = (
  rawValue?: string | null
): EmergencyWhatsAppRecord | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    const number = normalizeWhatsAppNumber(String(parsed?.number || parsed?.whatsappNumber || ''));
    if (!number) return null;

    const updatedAt = parsed?.updatedAt ? new Date(parsed.updatedAt) : null;
    return {
      number,
      updatedAt: updatedAt && !Number.isNaN(updatedAt.getTime())
        ? updatedAt.toISOString()
        : new Date(0).toISOString(),
    };
  } catch {
    const number = normalizeWhatsAppNumber(rawValue);
    return number
      ? { number, updatedAt: new Date(0).toISOString() }
      : null;
  }
};

export const loadEmergencyWhatsAppRecord = async (
  user?: any
): Promise<EmergencyWhatsAppRecord | null> => {
  const accountUser = await getStoredUser(user);
  const rawValue = await AsyncStorage.getItem(getEmergencyWhatsAppStorageKey(accountUser));
  return parseEmergencyWhatsAppRecord(rawValue);
};

export const saveEmergencyWhatsAppNumber = async (
  number: string,
  user?: any,
  updatedAt = new Date().toISOString()
) => {
  const accountUser = await getStoredUser(user);
  const normalizedNumber = normalizeWhatsAppNumber(number);
  if (!normalizedNumber) {
    throw new Error('Enter a valid WhatsApp number.');
  }

  const record: EmergencyWhatsAppRecord = {
    number: normalizedNumber,
    updatedAt,
  };
  const storageKey = getEmergencyWhatsAppStorageKey(accountUser);
  await AsyncStorage.setItem(storageKey, JSON.stringify(record));

  return {
    record,
    storageKey,
  };
};
