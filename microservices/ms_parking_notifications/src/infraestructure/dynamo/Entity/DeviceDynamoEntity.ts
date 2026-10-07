export interface DynamoPushDeviceItem {
  token: string;
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  updated_at: string;
}
