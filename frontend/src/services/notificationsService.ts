
import api from '@/config/api';

export interface Notification {
  id: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationsService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const response = await api.get(`/notifications/${userId}`);
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  }
};
