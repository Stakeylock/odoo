
import api from '@/config/api';

export interface Answer {
  id: string;
  answer: string;
  is_accepted: boolean;
  created_at: string;
  user_id: string;
  author: {
    id: string;
    username: string;
  };
  vote_count: number;
  user_vote?: 'upvote' | 'downvote' | null;
  can_accept?: boolean;
}

export interface CreateAnswerData {
  content: string; // Maps to 'answer' in backend
  question_id: string;
}

export const answersService = {
  async createAnswer(data: CreateAnswerData): Promise<Answer> {
    const response = await api.post('/answers', data);
    return response.data.answer;
  },

  async updateAnswer(id: string, data: { content: string }): Promise<Answer> {
    const response = await api.put(`/answers/${id}`, data);
    return response.data.answer;
  },

  async deleteAnswer(id: string): Promise<void> {
    await api.delete(`/answers/${id}`);
  },

  async voteAnswer(id: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    await api.post(`/answers/${id}/vote`, { type: voteType });
  },

  async acceptAnswer(id: string): Promise<void> {
    await api.post(`/answers/${id}/accept`);
  }
};
