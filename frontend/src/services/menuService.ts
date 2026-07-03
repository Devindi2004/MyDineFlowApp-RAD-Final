import { api } from './api';
import type { MenuItem } from '../types';

export const menuService = {
  async getMenuItems(restaurantId?: string): Promise<MenuItem[]> {
    const params = restaurantId ? { restaurantId } : {};
    const { data } = await api.get('/menu', { params });
    return data.data ?? data;
  },

  async getMenuItemById(id: string): Promise<MenuItem> {
    const { data } = await api.get(`/menu/${id}`);
    return data.data;
  },

  async createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
    const { data } = await api.post('/menu', item);
    return data.data;
  },

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const { data } = await api.put(`/menu/${id}`, updates);
    return data.data;
  },

  async deleteMenuItem(id: string): Promise<void> {
    await api.delete(`/menu/${id}`);
  },
};
