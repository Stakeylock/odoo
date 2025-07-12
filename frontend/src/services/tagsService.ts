
import api from '@/config/api';

export interface Tag {
  id: number;
  name: string;
  question_count?: number;
}

export const tagsService = {
  async getTags(): Promise<Tag[]> {
    const response = await api.get('/tags');
    return response.data.tags || response.data;
  },

  async getPopularTags(): Promise<Tag[]> {
    const response = await api.get('/tags/popular');
    return response.data.tags || response.data;
  }
};
