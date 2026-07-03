import { api } from './api';
import type { StaffUser } from '../types';

export const userService = {
  async listUsers(): Promise<StaffUser[]> {
    const { data } = await api.get('/users');
    return data.data ?? data;
  },

  async createUser(userData: Partial<StaffUser> & { password: string }): Promise<StaffUser> {
    const { data } = await api.post('/users', userData);
    return data.data;
  },

  async updateUser(id: string, updates: Partial<StaffUser>): Promise<StaffUser> {
    const { data } = await api.patch(`/users/${id}`, updates);
    return data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
