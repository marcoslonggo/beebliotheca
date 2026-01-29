import client from './client';
import {
  BookClub,
  BookClubComment,
  BookClubCommentInput,
  BookClubCreateRequest,
  BookClubDetail,
  BookClubMember,
  BookClubMemberInput,
  BookClubMemberUpdateRequest,
  BookClubProgress,
  BookClubProgressInput,
  BookClubSummary,
  BookClubUpdateRequest,
} from '../types/bookClub';

export const listBookClubs = async (): Promise<BookClubSummary[]> => {
  const response = await client.get<BookClubSummary[]>('/book-clubs');
  return response.data;
};

export const createBookClub = async (payload: BookClubCreateRequest): Promise<BookClub> => {
  const response = await client.post<BookClub>('/book-clubs', payload);
  return response.data;
};

export const getBookClub = async (clubId: string): Promise<BookClubDetail> => {
  const response = await client.get<BookClubDetail>(`/book-clubs/${clubId}`);
  return response.data;
};

export const updateBookClub = async (clubId: string, payload: BookClubUpdateRequest): Promise<BookClub> => {
  const response = await client.patch<BookClub>(`/book-clubs/${clubId}`, payload);
  return response.data;
};

export const addMember = async (clubId: string, payload: BookClubMemberInput): Promise<BookClubMember> => {
  const response = await client.post<BookClubMember>(`/book-clubs/${clubId}/members`, payload);
  return response.data;
};

export const updateMember = async (
  clubId: string,
  userId: string,
  payload: BookClubMemberUpdateRequest,
): Promise<BookClubMember> => {
  const response = await client.patch<BookClubMember>(`/book-clubs/${clubId}/members/${userId}`, payload);
  return response.data;
};

export const removeMember = async (clubId: string, userId: string): Promise<void> => {
  await client.delete(`/book-clubs/${clubId}/members/${userId}`);
};

export const updateProgress = async (
  clubId: string,
  payload: BookClubProgressInput,
): Promise<BookClubProgress> => {
  const response = await client.put<BookClubProgress>(`/book-clubs/${clubId}/progress`, payload);
  return response.data;
};

export const listComments = async (clubId: string): Promise<BookClubComment[]> => {
  const response = await client.get<BookClubComment[]>(`/book-clubs/${clubId}/comments`);
  return response.data;
};

export const createComment = async (
  clubId: string,
  payload: BookClubCommentInput,
): Promise<BookClubComment> => {
  const response = await client.post<BookClubComment>(`/book-clubs/${clubId}/comments`, payload);
  return response.data;
};
