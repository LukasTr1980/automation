// File: Layout.tsx
import React from 'react';
import {
  Container,
  Grid,
  Box,
  Typography
} from '@mui/material';
import NavMenu from './components/menu/NavMenu';
import LoadingSpinner from './components/LoadingSpinner';
import logo from './images/logo-512x512.png';
import { LayoutProps } from './types/types';
import { useUserStore } from './utils/store';
import { useTranslation } from 'react-i18next';
import useCountdown from './utils/useCountdown';

const appVersion = import.meta.env.VITE_APP_VERSION;

const Layout: React.FC<LayoutProps> = ({
  title,
  children,
  loading = false,
  showNavMenu = true,
  showLogo = false
}) => {
  const { userLogin } = useUserStore();
  const { value: countdownTime, refreshing } = useCountdown();
  const { t } = useTranslation();

  const containerPaddingBottom = userLogin === 'admin' ? '90px' : '70px';
  const countdownDisplay = refreshing ? t('refreshingToken') : countdownTime;

  return (
    <>
      {showNavMenu && <NavMenu />}
      <Container style={{ paddingBottom: containerPaddingBottom, maxWidth: '700px' }}>
        <Grid container paddingTop={9}>
          {loading ? (
            <Grid item xs={12}>
              <LoadingSpinner />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sx={{ paddingBottom: { xs: 1, sm: 4 } }}>
                <Typography align="center" fontWeight='bold' textTransform='uppercase' sx={{ fontSize: { xs: '1.3em', sm: '2em' } }}>{title}</Typography>
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
            </>
          )}
        </Grid>
      </Container>
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 0',
        backgroundColor: 'whitesmoke',
      }}>
        <Typography variant='body2' color='black' fontWeight='bold'>
          Version: {appVersion}
        </Typography>
        {userLogin === 'admin' &&
          <Typography variant='body2' color='black' fontWeight='bold'>
            {t('tokenExpiresIn')}:&nbsp;
            <span style={{ color: refreshing ? 'green' : 'inherit' }}>
              {countdownDisplay}
            </span>
          </Typography>
        }
      </div>
    </>
  );
};

export default Layout;
