import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationsApi from '../../api/notifications';
import * as invitationsApi from '../../api/invitations';
import { Notification } from '../../types/library';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';

export const NotificationBellTailwind = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch recent notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.listNotifications(false, 10),
    enabled: isOpen, // Only fetch when menu is open
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationsApi.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setIsOpen(false);
    },
  });

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationsApi.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsOpen(false);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAcceptInvitation = (invitationId: string, notificationId: string) => {
    acceptInvitationMutation.mutate(invitationId);
    markAsReadMutation.mutate(notificationId);
  };

  const handleDeclineInvitation = (invitationId: string, notificationId: string) => {
    declineInvitationMutation.mutate(invitationId);
    markAsReadMutation.mutate(notificationId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const baseButton =
    "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors relative";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`${baseButton} ${
          darkMode
            ? "bg-[#0f0f0f] border-[#2a2a2a] hover:bg-[#1f1f1f]"
            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${darkMode ? 'text-gray-200' : 'text-gray-500'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-96 rounded-xl border shadow-lg z-50 ${
            darkMode ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
          }`}
        >
          <div className={`p-4 border-b ${darkMode ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
            <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Notifications
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b transition-colors ${
                    darkMode ? 'border-[#2a2a2a]' : 'border-gray-200'
                  } ${
                    notification.read
                      ? ''
                      : darkMode
                      ? 'bg-[#0f0f0f]'
                      : 'bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {notification.title}
                    </h4>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>

                  {notification.type === 'library_invitation' && notification.data?.invitation_id && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAcceptInvitation(notification.data.invitation_id, notification.id)}
                        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeclineInvitation(notification.data.invitation_id, notification.id)}
                        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
