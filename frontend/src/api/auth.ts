import client from './client';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth';

export const register = async (data: RegisterRequest): Promise<User> => {
  const response = await client.post<User>('/auth/register', data);
  return response.data;
};

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const response = await client.post<TokenResponse>('/auth/login', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await client.get<User>('/auth/me');
  return response.data;
};

export const searchUsers = async (username: string): Promise<User[]> => {
  const response = await client.get<User[]>(`/auth/users/search`, { params: { username } });
  return response.data;
};
