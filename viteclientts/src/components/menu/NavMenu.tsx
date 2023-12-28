import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../../images/logo-192x192.png';

const NavMenu: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = (): void => {
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
          { text: 'Settings', path: '/settings' }
        ].map(({ text, path }) => {
          const basePath: string = path.split('/')[1];
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
              <NavLink to='/home'>
                <img src={logo} alt='Logo' style={{ height: '40px' }} />
              </NavLink>
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