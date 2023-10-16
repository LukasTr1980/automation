import Layout from '../Layout';
import { Box, Typography, Button, Grid } from '@mui/material';  // Import Button
import { Link as RouterLink } from 'react-router-dom';  // Import RouterLink
import logo from '../images/logo-512x512.png';

const HomePage = () => {
  const appVersion = import.meta.env.VITE_APP_VERSION;
  return (
    <Layout title="Automation" showBackButton={false} logo={logo}>
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/villa-anna/home"
            sx={{ my: 2, width: '200px' }}  // Set a width and margin
          >
            Villa Anna
          </Button>
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/settings"
            sx={{ my: 2, width: '200px' }}  // Set the same width and margin
          >
            Settings
          </Button>
        </Box>
      </Grid>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Typography variant='body2' gutterBottom>
          Version: {appVersion}
        </Typography>
      </Box>
    </Layout>
  );
};

export default HomePage;
