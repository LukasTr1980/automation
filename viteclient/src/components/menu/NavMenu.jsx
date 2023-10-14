import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const NavMenu = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <List>
      {[
        { text: 'Villa Anna', path: '/villa-anna/home' },
        { text: 'Tisens Julia', path: '/tisens-julia/home' },
        { text: 'Tisens Simone', path: '/tisens-simone/home'  },
        { text: 'Settings', path: '/settings' }
      ].map(({ text, path }) => (
        <ListItemButton key={text} component={RouterLink} to={path}>
          {text}
        </ListItemButton>
      )) }
    </List>
  );

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {isSmallScreen ? (
            <>
              <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle}>
                <MenuIcon />
              </IconButton>
              <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerToggle}>
                {drawer}
              </Drawer>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/villa-anna/home">Villa Anna</Button>
              <Button color="inherit" component={RouterLink} to="/tisens-julia/home">Tisens Julia</Button>
              <Button color="inherit" component={RouterLink} to="/tisens-simone/home">Tisens Simone</Button>
              <Button color="inherit" component={RouterLink} to="/settings">Settings</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavMenu;
