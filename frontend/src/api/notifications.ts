import client from './client';
import { Notification } from '../types/library';

export const listNotifications = async (
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<Notification[]> => {
  const response = await client.get<Notification[]>('/notifications', {
    params: { unread_only: unreadOnly, limit },
  });
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await client.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
};

export const markNotificationAsRead = async (
  notificationId: string,
  read: boolean = true
): Promise<Notification> => {
  const response = await client.patch<Notification>(`/notifications/${notificationId}`, { read });
  return response.data;
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await client.post('/notifications/mark-all-read');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await client.delete(`/notifications/${notificationId}`);
};
