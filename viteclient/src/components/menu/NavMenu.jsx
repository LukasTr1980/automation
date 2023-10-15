import { useState } from 'react';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink } from 'react-router-dom';

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
        { text: 'Home', path: '/home' },
        { text: 'Villa Anna', path: '/villa-anna/home' },
        { text: 'Tisens Julia', path: '/tisens-julia/home' },
        { text: 'Tisens Simone', path: '/tisens-simone/home' },
        { text: 'Settings', path: '/settings' }
      ].map(({ text, path }) => (
        <ListItemButton key={text} component={NavLink} to={path} selected={window.location.pathname === path}>
          {text}
        </ListItemButton>
      ))}
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
              <Button
                color='inherit'
                component={NavLink}
                to="/home"
                style={window.location.pathname === "/home" ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/home" ? "contained" : "text"}
              >
                Home
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/villa-anna/home"
                style={window.location.pathname === "/villa-anna/home" ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/villa-anna/home" ? "contained" : "text"}
              >
                Villa Anna
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/tisens-julia/home"
                style={window.location.pathname === "/tisens-julia/home" ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/tisens-julia/home" ? "contained" : "text"}
              >
                Tisens Julia
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/tisens-simone/home"
                style={window.location.pathname === "/tisens-simone/home" ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/tisens-simone/home" ? "contained" : "text"}
              >
                Tisens Simone
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/settings"
                style={window.location.pathname === "/settings" ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/settings" ? "contained" : "text"}
              >
                Settings
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavMenu;
