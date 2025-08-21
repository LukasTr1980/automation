import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { CONTENT_MAX_WIDTH } from '../utils/layout';

const NavBar: React.FC = () => {
  // Pages and labels used across desktop and mobile
  const pages = [
    { label: 'Start', path: '/' },
    { label: 'Bewässerung', path: '/bewaesserung' },
    { label: 'Timer', path: '/countdown' },
  ];

  const location = useLocation();
  // Note: responsive behavior handled via sx display props; no media query needed.

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <Box component="nav" aria-label="Navigation" sx={{
      borderBottom: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.default'
    }}>
      <Box sx={{
        width: { xs: '100%', md: CONTENT_MAX_WIDTH },
        mx: 'auto',
        px: { xs: 2, md: 3 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {/* Brand */}
        <Typography
          variant="h6"
          noWrap
          component={RouterLink}
          to="/"
          sx={{
            mr: 1,
            display: 'flex',
            textDecoration: 'none',
            color: 'text.primary',
            fontWeight: 700,
            fontSize: { xs: '1rem', sm: '1.125rem' }
          }}
        >
          Villa Anna
        </Typography>

        {/* Desktop buttons */}
        <Box sx={{ ml: 'auto', display: { xs: 'none', sm: 'flex' }, gap: 0.25 }}>
          {pages.map((page) => {
            const active = location.pathname === page.path;
            return (
              <Button
                key={page.path}
                component={RouterLink}
                to={page.path}
                color="inherit"
                aria-current={active ? 'page' : undefined}
                sx={{
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.5,
                  fontWeight: active ? 600 : 500,
                  color: 'text.primary',
                  '&:hover': { backgroundColor: 'action.hover' },
                  position: 'relative'
                }}
              >
                {/* Subtle active dot */}
                {active && (
                  <Box sx={{
                    position: 'absolute',
                    left: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main'
                  }} />
                )}
                <Box component="span" sx={{ pl: active ? 1.5 : 0 }}>{page.label}</Box>
              </Button>
            );
          })}
        </Box>

        {/* Mobile menu */}
        <Box sx={{ ml: 'auto', display: { xs: 'flex', sm: 'none' } }}>
          <IconButton
            size="large"
            aria-label="Menü öffnen"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleOpenNavMenu}
            color="inherit"
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
          >
            {pages.map((page) => {
              const active = location.pathname === page.path;
              return (
                <MenuItem
                  key={page.path}
                  component={RouterLink}
                  to={page.path}
                  onClick={handleCloseNavMenu}
                  aria-current={active ? 'page' : undefined}
                  selected={active}
                  sx={{ textDecoration: 'none', color: 'text.primary' }}
                >
                  {active && (
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mr: 1 }} />
                  )}
                  <Typography textAlign="center">{page.label}</Typography>
                </MenuItem>
              );
            })}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

export default NavBar;
