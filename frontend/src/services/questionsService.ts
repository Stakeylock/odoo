
import api from '@/config/api';

export interface Question {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  author: {
    id: string;
    username: string;
  };
  tags: {
    id: number;
    name: string;
  }[];
  answer_count: number;
  vote_count: number;
  user_vote?: 'upvote' | 'downvote' | null;
  can_edit?: boolean;
  answers?: Answer[];
}

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

export interface CreateQuestionData {
  title: string;
  content: string; // Maps to 'description' in backend
  tags: string[];
}

export const questionsService = {
  async getQuestions(params?: { 
    search?: string; 
    tag?: string; 
    page?: number; 
    limit?: number; 
    sort?: 'recent' | 'popular' | 'oldest';
  }): Promise<{ questions: Question[]; pagination: any }> {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  async getQuestion(id: string): Promise<Question> {
    const response = await api.get(`/questions/${id}`);
    return response.data.question;
  },

  async createQuestion(data: CreateQuestionData): Promise<Question> {
    const response = await api.post('/questions', data);
    return response.data.question;
  },

  async updateQuestion(id: string, data: CreateQuestionData): Promise<Question> {
    const response = await api.put(`/questions/${id}`, data);
    return response.data.question;
  },

  async deleteQuestion(id: string): Promise<void> {
    await api.delete(`/questions/${id}`);
  },

  async voteQuestion(id: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    await api.post(`/questions/${id}/vote`, { type: voteType });
  }
};
