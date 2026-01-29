import { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as notificationsApi from '../../api/notifications';
import * as invitationsApi from '../../api/invitations';
import { Notification } from '../../types/library';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
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
    enabled: Boolean(anchorEl), // Only fetch when menu is open
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
      queryClient.invalidateQueries({ queryKey: ['library-members'] });
      setAnchorEl(null);
    },
  });

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationsApi.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setAnchorEl(null);
    },
  });

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle different notification types
    if (notification.type === 'library_invitation') {
      // Invitation actions are handled inline, don't close
      return;
    }

    handleClose();
  };

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

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Notifications
          </Typography>
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  whiteSpace: 'normal',
                  py: 1.5,
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {notification.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(notification.created_at)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {notification.message}
                </Typography>

                {notification.type === 'library_invitation' && notification.data?.invitation_id && (
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptInvitation(notification.data.invitation_id, notification.id);
                      }}
                      disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeclineInvitation(notification.data.invitation_id, notification.id);
                      }}
                      disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                    >
                      Decline
                    </Button>
                  </Box>
                )}
              </MenuItem>
            ))}
          </>
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  navigate('/notifications');
                  handleClose();
                }}
              >
                View All
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
