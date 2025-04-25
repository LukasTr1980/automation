import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme, Typography, AppBar, Grid } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../../images/logo-60x60.webp';
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
      <Button
        sx={{ color: '#1565C0', '&:hover': { backgroundColor: '#D2E9F0', color: '#1565C0' } }}
        component={NavLink}
        to="/user"
      >
        <Typography textTransform='capitalize'>
          {userLogin}
        </Typography>
      </Button>

    </div>
  ) : (
    <div style={{ marginLeft: 'auto', paddingRight: 2 }}>
      <Typography>{t('notAvailable')}</Typography>
    </div>
  );

  const drawer = (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '10px',
        borderBottom: '1px solid lightgrey'
      }}>
        <NavLink to='/home' style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img src={logo} alt='Logo' width='60px' height='60px' />
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
      <AppBar sx={{
        color: 'black',
        backgroundColor: 'transparent',
        alignItems: 'center',
        boxShadow: 'none',
        marginTop: 2
      }}>
        <Grid container width='100%' alignItems='center' justifyContent='center'>
          <Toolbar
            sx={{
              backgroundColor: '#EFF7F9',
              maxWidth: '700px',
              width: '100%',
              border: 1,
              borderColor: 'lightgrey',
              marginLeft: 1,
              marginRight: 1,
            }}>

            {isSmallScreen ? (
              <>
                <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle}>
                  <MenuIcon />
                </IconButton>
                <NavLink to='/home' style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <img src={logo} alt='Logo' width='60px' height='60px' />
                </NavLink>
                <Drawer
                  anchor="left"
                  open={drawerOpen}
                  onClose={handleDrawerToggle}
                  slotProps={{ paper: { sx: { width: '60%' } } }}
                >
                  {drawer}
                </Drawer>
              </>
            ) : (
              <>
                <NavLink to='/home' style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  <img src={logo} alt='Logo' width='60px' height='60px' />
                </NavLink>
                <Button
                  sx={{ color: 'black', '&:hover': { backgroundColor: '#D2E9F0', color: 'black' } }}
                  component={NavLink}
                  to="/home"
                >
                  Home
                </Button>
                <Button
                  sx={{ color: 'black', '&:hover': { backgroundColor: '#D2E9F0', color: 'black' } }}
                  component={NavLink}
                  to="/villa-anna/home"
                >
                  Villa Anna
                </Button>
                {userLogin === 'admin' && (
                  <Button
                    sx={{ color: 'black', '&:hover': { backgroundColor: '#D2E9F0', color: 'black' } }}
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
        </Grid>
      </AppBar>
    </>
  );
};

export default NavMenu;
