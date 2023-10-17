import {
  Container,
  Grid,
  Box,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import BackButton from './components/BackButton';
import NavMenu from './components/menu/NavMenu';
import LoadingSpinner from './components/LoadingSpinner';
import logo from './images/logo-512x512.png';

const Layout = ({ title, children, showBackButton, loading, showNavMenu, showLogo }) => {
  return (
    <>
      {showNavMenu && <NavMenu />}
      <Container>
        <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto', mt: 8 }}>
          <Grid container spacing={3} justify="center" alignItems="center">

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
                          marginBottom: '20px',
                        }}
                      />
                    )}
                    {showBackButton && (
                      <Box sx={{ alignSelf: 'flex-start' }}>
                        <BackButton />
                      </Box>
                    )}
                    <Typography variant="h4" align="center">{title}</Typography>
                  </Box>
                </Grid>

                {children}
              </>
            )}

          </Grid>
        </Box>
      </Container>
    </>
  );
};

Layout.defaultProps = {
  showBackButton: true,
  loading: false,
  showNavMenu: true,
  showLogo: false,
};

Layout.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  showBackButton: PropTypes.bool,
  loading: PropTypes.bool,
  showNavMenu: PropTypes.bool,
  showLogo: PropTypes.bool,
};

export default Layout;
