
import api from '@/config/api';

export interface Question {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    avatar_url?: string;
  };
  question_tags: {
    tags: {
      id: number;
      name: string;
    };
  }[];
  answers: {
    id: string;
  }[];
}

export interface CreateQuestionData {
  title: string;
  description: string;
  tags: string[];
}

export const questionsService = {
  async getQuestions(params?: { search?: string; tag?: string }): Promise<Question[]> {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  async getQuestion(id: string): Promise<Question> {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  async createQuestion(data: CreateQuestionData): Promise<Question> {
    const response = await api.post('/questions', data);
    return response.data;
  },

  async deleteQuestion(id: string): Promise<void> {
    await api.delete(`/questions/${id}`);
  }
};
