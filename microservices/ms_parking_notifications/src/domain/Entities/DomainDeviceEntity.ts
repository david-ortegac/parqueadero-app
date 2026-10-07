export type DevicePlatform = 'ios' | 'android' | 'web';

export interface DomainPushDeviceEntity {
  token: string;
  user_id: string;
  platform: DevicePlatform;
  created_at?: string;
  updated_at?: string;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
