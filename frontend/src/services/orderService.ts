import { api } from './api';
import type { Order } from '../types';

export const orderService = {
  async getOrders(params?: Record<string, string>): Promise<Order[]> {
    const { data } = await api.get('/orders', { params });
    return data.data ?? data;
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await api.get(`/orders/${id}`);
    return data.data;
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const { data } = await api.post('/orders', orderData);
    return data.data;
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    return data.data;
  },

  async deleteOrder(id: string): Promise<void> {
    await api.delete(`/orders/${id}`);
  },
};
