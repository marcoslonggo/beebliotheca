import client from './client';
import {
  Library,
  LibraryCreateRequest,
  LibraryMember,
  LibraryMemberCreateRequest,
  LibraryMemberUpdateRequest,
  LibraryUpdateRequest,
} from '../types/library';

export const listLibraries = async (): Promise<Library[]> => {
  const response = await client.get<Library[]>('/libraries');
  return response.data;
};

export const createLibrary = async (data: LibraryCreateRequest): Promise<Library> => {
  const response = await client.post<Library>('/libraries', data);
  return response.data;
};

export const getLibrary = async (id: string): Promise<Library> => {
  const response = await client.get<Library>(`/libraries/${id}`);
  return response.data;
};

export const updateLibrary = async (id: string, data: LibraryUpdateRequest): Promise<Library> => {
  const response = await client.patch<Library>(`/libraries/${id}`, data);
  return response.data;
};

export const deleteLibrary = async (id: string): Promise<void> => {
  await client.delete(`/libraries/${id}`);
};

export const listLibraryMembers = async (libraryId: string): Promise<LibraryMember[]> => {
  const response = await client.get<LibraryMember[]>(`/libraries/${libraryId}/members`);
  return response.data;
};

export const addLibraryMember = async (
  libraryId: string,
  data: LibraryMemberCreateRequest
): Promise<LibraryMember> => {
  const response = await client.post<LibraryMember>(`/libraries/${libraryId}/members`, data);
  return response.data;
};

export const updateLibraryMember = async (
  libraryId: string,
  userId: string,
  data: LibraryMemberUpdateRequest
): Promise<LibraryMember> => {
  const response = await client.patch<LibraryMember>(
    `/libraries/${libraryId}/members/${userId}`,
    data
  );
  return response.data;
};

export const removeLibraryMember = async (libraryId: string, userId: string): Promise<void> => {
  await client.delete(`/libraries/${libraryId}/members/${userId}`);
};
