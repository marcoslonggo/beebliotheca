import client from './client';
import {
  LibraryInvitation,
  LibraryInvitationCreateRequest,
  LibraryInvitationWithDetails,
} from '../types/library';

export const createInvitation = async (
  libraryId: string,
  data: LibraryInvitationCreateRequest
): Promise<LibraryInvitation> => {
  const response = await client.post<LibraryInvitation>(
    `/invitations/libraries/${libraryId}/invite`,
    data
  );
  return response.data;
};

export const listPendingInvitations = async (): Promise<LibraryInvitationWithDetails[]> => {
  const response = await client.get<LibraryInvitationWithDetails[]>('/invitations/pending');
  return response.data;
};

export const acceptInvitation = async (invitationId: string): Promise<void> => {
  await client.post(`/invitations/${invitationId}/accept`);
};

export const declineInvitation = async (invitationId: string): Promise<void> => {
  await client.post(`/invitations/${invitationId}/decline`);
};

export const listLibraryInvitations = async (libraryId: string): Promise<LibraryInvitation[]> => {
  const response = await client.get<LibraryInvitation[]>(
    `/invitations/libraries/${libraryId}/invitations`
  );
  return response.data;
};

export const cancelInvitation = async (invitationId: string): Promise<void> => {
  await client.delete(`/invitations/${invitationId}`);
};
