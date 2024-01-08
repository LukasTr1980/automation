// File: Layout.tsx
import React from 'react';
import {
  Container,
  Grid,
  Box,
  Typography
} from '@mui/material';
import BackButton from './components/BackButton';
import NavMenu from './components/menu/NavMenu';
import LoadingSpinner from './components/LoadingSpinner';
import logo from './images/logo-512x512.png';
import { LayoutProps } from './types/types';

const appVersion = import.meta.env.VITE_APP_VERSION;

const Layout: React.FC<LayoutProps> = ({ 
  title, 
  children, 
  showBackButton = true, 
  loading = false, 
  showNavMenu = true, 
  showLogo = false 
}) => {
  return (
    <>
      {showNavMenu && <NavMenu />}
      <Container>
        <Box sx={{ 
          width: { xs: '100%', md: '60%' }, 
          mx: 'auto', 
          mt: 8,
          mb: '48px'
          }}>
          <Grid container spacing={3} justifyContent="center" alignItems="center">

            {loading ? (
              <Grid item xs={12}>
                <LoadingSpinner />
              </Grid>
            ) : (
              <>
                <Grid item xs={12}>
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
                    {showBackButton && (
                      <Box sx={{ alignSelf: 'flex-start' }}>
                        <BackButton />
                      </Box>
                    )}
                    <Typography variant="h5" align="center">{title}</Typography>
                  </Box>
                </Grid>

                {children}
              </>
            )}

          </Grid>
        </Box>
      </Container>
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 0',
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: for visibility
      }}>
        <Typography variant='body2' color='black' fontWeight='bold'>
          Version: {appVersion}
        </Typography>
      </div>
    </>
  );
};

export default Layout;
