/**
 * ZegoCloud Configuration for FitFaat Video Calls
 * 
 * Provides App ID, App Sign, and helper functions for
 * mapping FitFaat users to ZegoCloud identities.
 */
import { getConfigValue } from './config';

// ZegoCloud credentials - loaded via centralized config helper
export const ZEGO_APP_ID: number = parseInt(getConfigValue('ZEGO_APP_ID') || '0', 10);
export const ZEGO_APP_SIGN: string = getConfigValue('ZEGO_APP_SIGN') || '';

const ZEGO_ID_MAX_LENGTH = 64;

function sanitizeZegoID(value: unknown): string {
  return String(value || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, ZEGO_ID_MAX_LENGTH);
}

/**
 * Generate a ZegoCloud-compatible user ID from a FitFaat user object.
 * ZegoCloud userID must be a string of alphanumeric characters.
 * MongoDB ObjectIDs are already alphanumeric, so we use them directly.
 */
export function getZegoUserID(user: any): string {
  if (!user) return `user_${Date.now()}`;
  
  const id = user._id || user.id || user.userId;
  if (id) {
    const safeID = sanitizeZegoID(id);
    if (safeID) return safeID;
  }
  
  return `user_${Date.now()}`;
}

/**
 * Generate a display name for ZegoCloud from a FitFaat user object.
 */
export function getZegoUserName(user: any): string {
  if (!user) return 'User';
  return user.name || user.username || user.fullName || user.email || 'User';
}

/**
 * Generate a deterministic call/room ID from an appointment ID.
 * Both doctor and patient will use this same room ID to join the call.
 * 
 * ZegoCloud callID must be alphanumeric + underscore, max 64 chars.
 */
export function getCallID(appointmentId: string): string {
  if (!appointmentId) return `call_${Date.now()}`;
  const safeAppointmentID = sanitizeZegoID(appointmentId);
  if (!safeAppointmentID) return `call_${Date.now()}`;
  return `appt_${safeAppointmentID}`.slice(0, ZEGO_ID_MAX_LENGTH);
}
