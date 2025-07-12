
import api from '@/config/api';

export interface Tag {
  id: number;
  name: string;
}

export const tagsService = {
  async getTags(): Promise<Tag[]> {
    const response = await api.get('/tags');
    return response.data;
  }
};
