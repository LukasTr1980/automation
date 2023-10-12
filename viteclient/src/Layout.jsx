import {
  Container,
  Grid,
  Box,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import BackButton from './components/BackButton';
import NavMenu from './components/menu/NavMenu';

const Layout = ({ title, children, showBackButton }) => {
  return (
    <>
    <NavMenu />
    <Container>
      <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto' }}>
        <Grid container spacing={3} justify="center" alignItems="center">
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {showBackButton && (
                <Box sx={{ alignSelf: 'flex-start' }}>
                  <BackButton />
                </Box>
              )}
              <Typography variant="h3" align="center">{title}</Typography>
            </Box>
          </Grid>

          {children}

        </Grid>
      </Box>
    </Container>
    </>
  );
};

Layout.defaultProps = {
  showBackButton: true,
};

Layout.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    showBackButton: PropTypes.bool,
};

export default Layout;
