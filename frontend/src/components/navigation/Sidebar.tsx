import { useMemo } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ListAltIcon from "@mui/icons-material/ListAlt";
import GroupsIcon from "@mui/icons-material/Groups";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const Sidebar = ({ drawerWidth, mobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAdmin } = useAuth();

  const content = useMemo(() => {
    const items: NavItem[] = [
      { label: "Books", to: "/books", icon: <LibraryBooksIcon /> },
      { label: "Lists", to: "/lists", icon: <ListAltIcon /> },
      { label: "Book Clubs", to: "/book-clubs", icon: <GroupsIcon /> },
      { label: "Series", to: "/series", icon: <AutoStoriesIcon /> },
      { label: "Libraries", to: "/libraries", icon: <LocalLibraryIcon /> },
      { label: "Settings", to: "/settings", icon: <SettingsIcon /> },
    ];

    if (isAdmin) {
      items.splice(items.length - 1, 0, {
        label: "Admin",
        to: "/admin",
        icon: <AdminPanelSettingsIcon />,
      });
    }

    return (
      <Box sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
        <Toolbar sx={{ px: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Book Inventory
          </Typography>
        </Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <List>
            {items.map((item) => {
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <ListItemButton
                  key={item.label}
                  component={NavLink}
                  to={item.to}
                  selected={isActive}
                  sx={{ borderRadius: 2, mx: 2, mb: 1 }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Box>
    );
  }, [isAdmin, location.pathname]);

  return (
    <>
      {/* Mobile drawer - temporary */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "none",
              backgroundImage: "none",
              backgroundColor: "background.paper"
            }
          }}
        >
          {content}
        </Drawer>
      )}

      {/* Desktop drawer - permanent */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "none",
              backgroundImage: "none",
              backgroundColor: "background.paper"
            }
          }}
          open
        >
          {content}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
