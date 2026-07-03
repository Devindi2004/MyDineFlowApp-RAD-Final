import { api } from './api';
import type { LoginCredentials, RegisterData, User, AuthResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', credentials);
    return data.data;
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', userData);
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data.data;
  },

  async updateMe(updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'address'>>): Promise<User> {
    const { data } = await api.patch('/auth/me', updates);
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout').catch(() => {});
  },
};
