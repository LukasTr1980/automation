import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../../images/logo-192x192.png';
import TimeDisplay from '../TimeDisplay';

const NavMenu: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = (): void => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <div>
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
        <IconButton
          edge='end'
          color='inherit'
          aria-label='close'
          onClick={handleDrawerToggle}
        >
          <CloseIcon />
        </IconButton>
      </div>
      <List>
        {[
          { text: 'Home', path: '/home' },
          { text: 'Villa Anna', path: '/villa-anna/home' },
          { text: 'Settings', path: '/settings' }
        ].map(({ text, path }) => {
          return (
            <ListItemButton
              key={text}
              component={NavLink}
              to={path}
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
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerToggle}
              >
                {drawer}
              </Drawer>
            </>
          ) : (
            <>
              <NavLink to='/home' style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                <img src={logo} alt='Logo' style={{ height: '40px', marginRight: '25px' }} />
              </NavLink>
              <Button
                sx={{ color: 'white', '&:hover': { backgroundColor: '#1871CA', color: 'white' } }}
                component={NavLink}
                to="/home"
              >
                Home
              </Button>
              <Button
                sx={{ color: 'white', '&:hover': { backgroundColor: '#1871CA', color: 'white' } }}
                component={NavLink}
                to="/villa-anna/home"
              >
                Villa Anna
              </Button>
              <Button
                sx={{ color: 'white', '&:hover': { backgroundColor: '#1871CA', color: 'white' } }}
                component={NavLink}
                to="/settings"
              >
                Settings
              </Button>
            </>
          )}
          <div style={{ marginLeft: 'auto' }} >
            <TimeDisplay />
          </div>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavMenu;
