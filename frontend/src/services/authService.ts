
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
    try {
      const response = await api.post('/auth/register', data);
      // Backend returns { success: true, data: { user, token } }
      const { user, token } = response.data;
      
      // Store token and user info
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { userId: user.id, message: 'User registered successfully' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  async login(data: LoginData): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/login', data);
      // Backend returns { success: true, data: { user, token } }
      const { user, token } = response.data;
      
      // Store token and user info
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if the API call fails, we should still clear local storage
      console.warn('Logout API call failed, but clearing local storage');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }
};
