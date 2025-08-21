// File: Layout.tsx
import React, { useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';
import logo from './images/logo-512x512.webp';
import { LayoutProps, CopyrightProps } from './types/types';
import { useUserStore } from './utils/store';
const appVersion = import.meta.env.VITE_APP_VERSION;

const Layout: React.FC<LayoutProps> = ({
  children,
  showLogo = false
}) => {
  const { setBrowserInfo, osName, browserName, browserVersion } = useUserStore();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setBrowserInfo();

    const adjustViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    adjustViewportHeight();
    window.addEventListener('resize', adjustViewportHeight);
    window.addEventListener('orientationchange', adjustViewportHeight);

    return () => {
      window.removeEventListener('resize', adjustViewportHeight);
      window.removeEventListener('orientationchange', adjustViewportHeight);
    }

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
      <Container
        component='main'
        maxWidth={false}
        sx={{
          pb: 2,
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 3 }
        }}
      >
        <Grid container paddingTop={isSmallScreen ? 3 : 6}>
          {showLogo && (
            <Grid component="div" size={12} sx={{ paddingBottom: { xs: 1, sm: 2 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={logo}
                  alt='Logo'
                  style={{
                    width: '180px',
                    height: 'auto',
                    marginBottom: '24px',
                  }}
                />
              </Box>
            </Grid>
          )}
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
        
        <Typography variant='body1' color='black'>
          Client-Details: {osName}, {browserName} {browserVersion}
        </Typography>
        <Copyright />
      </Box>
    </>
  );
};

export default Layout;
