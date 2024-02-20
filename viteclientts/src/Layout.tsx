// File: Layout.tsx
import React, { useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import NavMenu from './components/menu/NavMenu';
import logo from './images/logo-512x512.webp';
import { LayoutProps, CopyrightProps } from './types/types';
import { useUserStore } from './utils/store';
import { useTranslation } from 'react-i18next';
import useCountdown from './utils/useCountdown';
const appVersion = import.meta.env.VITE_APP_VERSION;

const Layout: React.FC<LayoutProps> = ({
  title,
  children,
  showNavMenu = true,
  showLogo = false
}) => {
  const { userLogin, setBrowserInfo, osName, osVersion, browserName, browserVersion } = useUserStore();
  const { value: countdownTime, refreshing } = useCountdown();
  const { t } = useTranslation();
  const countdownDisplay = refreshing ? t('refreshingToken') : countdownTime;
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setBrowserInfo();
  }, [setBrowserInfo]);

  function Copyright(props: CopyrightProps) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={props.sx}>
        {'Copyright © '}
        Lukas Tröbinger
        {' '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>
    );
  }

  return (
    <>
      {showNavMenu && <NavMenu />}
      <Container component='main' sx={{ pt: isSmallScreen ? '64px' : '64px', paddingBottom: 2 }} style={{ maxWidth: '700px' }}>
        <Grid container paddingTop={isSmallScreen ? 3 : 6}>
          <Grid item xs={12} sx={{ paddingBottom: { xs: 1, sm: 2 } }}>
            <Typography align="center" textTransform='uppercase' sx={{ fontSize: { xs: '1.3em', sm: '2em' } }}>{title}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {showLogo && (
                <img
                  src={logo}
                  alt='Logo'
                  style={{
                    width: '180px',
                    height: 'auto',
                    marginBottom: '24px',
                  }}
                />
              )}
            </Box>
          </Grid>
          {children}
        </Grid>
      </Container>

      <Box
        component='footer'
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'whitesmoke'
        }}
      >
        <Typography variant='body1' color='black'>
          Version: {appVersion}
        </Typography>
        {userLogin === 'admin' &&
          <Typography variant='body1' color='black'>
            {t('tokenExpiresIn')}:&nbsp;
            <span style={{ color: refreshing ? 'green' : 'inherit' }}>
              {countdownDisplay}
            </span>
          </Typography>
        }
        <Typography variant='body1' color='black'>
          Client Details: {osName} {osVersion}, {browserName} {browserVersion}
        </Typography>
        <Copyright />
      </Box>
    </>
  );
};

export default Layout;
