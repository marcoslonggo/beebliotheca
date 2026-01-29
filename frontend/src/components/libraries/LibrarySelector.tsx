import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import {
  LibraryBooks as LibraryIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../contexts/LibraryContext';
import { useTheme } from '@mui/material/styles';

const LibrarySelector = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentLibrary, libraries, setCurrentLibrary } = useLibrary();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectLibrary = (libraryId: string) => {
    const library = libraries.find((lib) => lib.id === libraryId);
    if (library) {
      setCurrentLibrary(library);
    }
    handleClose();
  };

  const handleManageLibraries = () => {
    navigate('/libraries');
    handleClose();
  };

  if (libraries.length === 0) {
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => navigate('/libraries')}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          borderColor: alpha(theme.palette.divider, 0.3),
        }}
      >
        Create Library
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        endIcon={<ArrowDownIcon />}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          px: 2,
          py: 0.75,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          color: 'text.primary',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.12),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LibraryIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600}>
            {currentLibrary?.name || 'Select Library'}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 250,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            YOUR LIBRARIES
          </Typography>
        </Box>

        {libraries.map((library) => (
          <MenuItem
            key={library.id}
            selected={library.id === currentLibrary?.id}
            onClick={() => handleSelectLibrary(library.id)}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 1,
              mx: 1,
            }}
          >
            <ListItemIcon>
              <LibraryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={library.name}
              secondary={library.description || undefined}
              primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={handleManageLibraries} sx={{ py: 1.5, px: 2 }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Manage Libraries" primaryTypographyProps={{ variant: 'body2' }} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default LibrarySelector;
