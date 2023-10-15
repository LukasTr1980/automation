import { useState } from 'react';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { NavLink } from 'react-router-dom';
import logo from '../../images/logo-192x192.png';

const NavMenu = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        borderBottom: '1px solid lightgrey'
      }}>
        <NavLink to='/home'>
          <img src={logo} alt='Logo' style={{ height: '40px' }} />
        </NavLink>
        <IconButton edge='end' color='inherit' aria-label='close' onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </div>
      <List>
        {[
          { text: 'Home', path: '/home' },
          { text: 'Villa Anna', path: '/villa-anna/home' },
          { text: 'Tisens Julia', path: '/tisens-julia/home' },
          { text: 'Tisens Simone', path: '/tisens-simone/home' },
          { text: 'Settings', path: '/settings' }
        ].map(({ text, path }) => {
          const basePath = path.split('/')[1];  // Extracts 'villa-anna' from '/villa-anna/home'
          return (
            <ListItemButton
              key={text}
              component={NavLink}
              to={path}
              style={{
                ...window.location.pathname.split('/')[1] === basePath ? { backgroundColor: 'lightgrey' } : {},
                fontSize: '1.1rem',
                padding: '10px 16px'
              }}
            >
              {text}
            </ListItemButton>
          )
        })}
      </List>
    </div>
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
              <NavLink to='/home' style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                <img src={logo} alt='Logo' style={{ height: '40px', marginRight: '8px' }} />
              </NavLink>
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
                style={window.location.pathname.includes('/villa-anna') ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/villa-anna/home" ? "contained" : "text"}
              >
                Villa Anna
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/tisens-julia/home"
                style={window.location.pathname.includes('/tisens-julia') ? { backgroundColor: 'darkblue' } : {}}
                variant={window.location.pathname === "/tisens-julia/home" ? "contained" : "text"}
              >
                Tisens Julia
              </Button>
              <Button
                color='inherit'
                component={NavLink}
                to="/tisens-simone/home"
                style={window.location.pathname.includes('/tisens-simone') ? { backgroundColor: 'darkblue' } : {}}
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
