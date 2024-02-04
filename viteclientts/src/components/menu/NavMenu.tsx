import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../../images/logo-192x192.png';
import { useUserStore } from '../../utils/store';
import { useTranslation } from 'react-i18next';
import LogoutButton from '../LogoutButton';

const NavMenu: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { userLogin } = useUserStore();
  const { t } = useTranslation();

  const handleDrawerToggle = (): void => {
    setDrawerOpen(!drawerOpen);
  };

  const userInfoDisplay = userLogin ? (
    <div style={{ marginLeft: 'auto', paddingRight: 2 }}>
      <Typography textTransform='capitalize'>
        {t('user')}: <strong>{userLogin}</strong>
      </Typography>

    </div>
  ) : null

  const drawer = (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        borderBottom: '1px solid lightgrey'
      }}>
        <NavLink to='/home' style={{ display: 'inline-flex', alignItems: 'center' }}>
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
          ...(userLogin === 'admin' ? [{ text: t('settings'), path: '/settings' }] : [])
        ].map(({ text, path }) => {
          return (
            <ListItemButton
              key={text}
              component={NavLink}
              to={path}
              style={{ fontSize: '1.3em' }}
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
              <NavLink to='/home' style={{ display: 'inline-flex', alignItems: 'center' }}>
                <img src={logo} alt='Logo' style={{ height: '40px' }} />
              </NavLink>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerToggle}
                PaperProps={{ style: { width: '60%' } }}
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
              {userLogin === 'admin' && (
                <Button
                  sx={{ color: 'white', '&:hover': { backgroundColor: '#1871CA', color: 'white' } }}
                  component={NavLink}
                  to="/settings"
                >
                  {t('settings')}
                </Button>
              )}
            </>
          )}

          {userInfoDisplay}
          <LogoutButton />

        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavMenu;
