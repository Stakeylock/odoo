
import api from '@/config/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  avatar_url?: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData): Promise<{ userId: string; message: string }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await api.post('/auth/login', data);
    const { token } = response.data;
    
    // Store token
    localStorage.setItem('auth_token', token);
    
    // Decode token to get user info (simple approach)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user: User = {
        id: payload.userId || payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        avatar_url: payload.avatar_url
      };
      localStorage.setItem('user', JSON.stringify(user));
      return { token, user };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { token };
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};
