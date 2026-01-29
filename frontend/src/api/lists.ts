import client from './client';
import {
  ListProgressStatus,
  ListRole,
  ListVisibility,
  ReadingList,
  ReadingListDetail,
  ReadingListItem,
  ReadingListItemInput,
  ReadingListMember,
  ReadingListMemberInput,
  ReadingListProgress,
  ReadingListSummary,
} from '../types/list';

export interface ReadingListCreateRequest {
  title: string;
  description?: string | null;
  visibility?: ListVisibility;
}

export interface ReadingListUpdateRequest {
  title?: string;
  description?: string | null;
  visibility?: ListVisibility;
}

export const fetchLists = async (): Promise<ReadingListSummary[]> => {
  const response = await client.get<ReadingListSummary[]>('/lists');
  return response.data;
};

export const createList = async (payload: ReadingListCreateRequest): Promise<ReadingList> => {
  const response = await client.post<ReadingList>('/lists', payload);
  return response.data;
};

export const getList = async (listId: string): Promise<ReadingListDetail> => {
  const response = await client.get<ReadingListDetail>(`/lists/${listId}`);
  return response.data;
};

export const updateList = async (listId: string, payload: ReadingListUpdateRequest): Promise<ReadingList> => {
  const response = await client.patch<ReadingList>(`/lists/${listId}`, payload);
  return response.data;
};

export const deleteList = async (listId: string): Promise<void> => {
  await client.delete(`/lists/${listId}`);
};

export const addListItem = async (listId: string, payload: ReadingListItemInput): Promise<ReadingListItem> => {
  const response = await client.post<ReadingListItem>(`/lists/${listId}/items`, payload);
  return response.data;
};

export const updateListItem = async (
  listId: string,
  itemId: string,
  payload: Partial<ReadingListItemInput>,
): Promise<ReadingListItem> => {
  const response = await client.patch<ReadingListItem>(`/lists/${listId}/items/${itemId}`, payload);
  return response.data;
};

export const removeListItem = async (listId: string, itemId: string): Promise<void> => {
  await client.delete(`/lists/${listId}/items/${itemId}`);
};

export const getMembers = async (listId: string): Promise<ReadingListMember[]> => {
  const response = await client.get<ReadingListMember[]>(`/lists/${listId}/members`);
  return response.data;
};

export const addMember = async (listId: string, payload: ReadingListMemberInput): Promise<ReadingListMember> => {
  const response = await client.post<ReadingListMember>(`/lists/${listId}/members`, payload);
  return response.data;
};

export const updateMember = async (
  listId: string,
  userId: string,
  role: ListRole,
): Promise<ReadingListMember> => {
  const response = await client.patch<ReadingListMember>(`/lists/${listId}/members/${userId}`, { role });
  return response.data;
};

export const removeMember = async (listId: string, userId: string): Promise<void> => {
  await client.delete(`/lists/${listId}/members/${userId}`);
};

export const getProgress = async (listId: string): Promise<ReadingListProgress[]> => {
  const response = await client.get<ReadingListProgress[]>(`/lists/${listId}/progress`);
  return response.data;
};

export const updateProgress = async (
  listId: string,
  itemId: string,
  status: ListProgressStatus,
  notes?: string | null,
): Promise<ReadingListProgress> => {
  const response = await client.put<ReadingListProgress>(`/lists/${listId}/items/${itemId}/progress`, {
    status,
    notes,
  });
  return response.data;
};
