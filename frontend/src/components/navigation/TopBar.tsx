import { useState } from "react";
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  alpha,
  InputBase,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LibrarySelector from "../libraries/LibrarySelector";
import NotificationBell from "../notifications/NotificationBell";

interface TopBarProps {
  drawerWidth: number;
  onToggleTheme: () => void;
  onMenuClick: () => void;
}

const TopBar = ({ drawerWidth, onToggleTheme, onMenuClick }: TopBarProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backdropFilter: "blur(6px)",
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: alpha(theme.palette.primary.main, 0.15)
            }}
          >
            <MenuBookIcon color="primary" />
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Welcome back
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {user?.full_name || 'Your Library'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <LibrarySelector />
        {!isMobile && (
          <Box
            sx={{
              position: "relative",
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.text.primary, 0.04),
              display: "flex",
              alignItems: "center",
              px: 2,
              py: 1,
              gap: 1,
              minWidth: 240
            }}
          >
            <SearchIcon fontSize="small" />
            <InputBase placeholder="Search books" sx={{ width: "100%" }} />
          </Box>
        )}
        <IconButton onClick={onToggleTheme} color="inherit">
          {isDark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
        <NotificationBell />
        <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: theme.palette.primary.main,
              fontSize: '0.875rem',
            }}
          >
            {user ? getInitials(user.full_name) : 'U'}
          </Avatar>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            {user?.email}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
