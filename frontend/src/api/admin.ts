import client from './client';
import {
  AdminUser,
  UpdateAdminStatusRequest,
  UpdateLibraryRoleRequest,
  UpdatePasswordRequest,
} from '../types/admin';

export const listUsers = async (): Promise<AdminUser[]> => {
  const response = await client.get<AdminUser[]>('/admin/users');
  return response.data;
};

export const updateAdminStatus = async (
  userId: string,
  payload: UpdateAdminStatusRequest,
): Promise<AdminUser> => {
  const response = await client.patch<AdminUser>(`/admin/users/${userId}/admin`, payload);
  return response.data;
};

export const updatePassword = async (
  userId: string,
  payload: UpdatePasswordRequest,
): Promise<void> => {
  await client.patch(`/admin/users/${userId}/password`, payload);
};

export const updateLibraryRole = async (
  userId: string,
  libraryId: string,
  payload: UpdateLibraryRoleRequest,
) => {
  const response = await client.patch(`/admin/users/${userId}/libraries/${libraryId}`, payload);
  return response.data;
};

export const removeUserFromLibrary = async (userId: string, libraryId: string): Promise<void> => {
  await client.delete(`/admin/users/${userId}/libraries/${libraryId}`);
};
