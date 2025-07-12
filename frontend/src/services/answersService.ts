
import api from '@/config/api';

export interface Answer {
  id: string;
  answer: string;
  is_accepted: boolean;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    avatar_url?: string;
  };
  votes: {
    vote_type: string;
    user_id: string;
  }[];
}

export interface CreateAnswerData {
  content: string;
}

export const answersService = {
  async getAnswers(questionId: string): Promise<Answer[]> {
    const response = await api.get(`/answers/${questionId}`);
    return response.data;
  },

  async createAnswer(questionId: string, data: CreateAnswerData): Promise<Answer> {
    const response = await api.post(`/answers/${questionId}`, data);
    return response.data;
  },

  async acceptAnswer(answerId: string): Promise<void> {
    await api.patch(`/answers/${answerId}/accept`);
  },

  async voteAnswer(answerId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    await api.post(`/answers/${answerId}/vote`, { voteType });
  }
};
