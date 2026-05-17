export const CHAT_ACCESS_GRANTED_TITLE = 'Chat Access Granted';
export const CHAT_ACCESS_GRANTED_BODY =
  'Your doctor has granted chat access. You can now send messages.';

const getIdValue = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value._id || value.id;
};

export type ChatAccessGrantedNotificationPayload = {
  type: 'chat';
  title: string;
  body: string;
  data: {
    appointmentId: string;
    chatId: string;
    doctorId?: string;
    patientId?: string;
    route: string;
  };
};

export const buildChatAccessGrantedNotificationPayload = (
  appointmentId: string,
  appointment?: any
): ChatAccessGrantedNotificationPayload => ({
  type: 'chat',
  title: CHAT_ACCESS_GRANTED_TITLE,
  body: CHAT_ACCESS_GRANTED_BODY,
  data: {
    appointmentId,
    chatId: appointmentId,
    doctorId: getIdValue(appointment?.doctorId) || getIdValue(appointment?.doctor),
    patientId:
      getIdValue(appointment?.patientId) ||
      getIdValue(appointment?.userId) ||
      getIdValue(appointment?.user),
    route: '/(main)/(conference)/appointment-chat',
  },
});
