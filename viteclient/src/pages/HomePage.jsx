import Layout from '../Layout';
import { Box, Typography } from '@mui/material';

const HomePage = () => {
  const appVersion = import.meta.env.VITE_APP_VERSION;
  return (
    <Layout title="Automation" showBackButton={false}>
      <Box
        sx={{
          position: 'fixed',  // Fixed position
          top: 0,  // Starts at the top
          left: 0,  // Starts on the left
          width: '100%',  // Full width
          height: '100%',  // Full height
          backgroundImage: 'url(/images/background.png)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: 0.2,  // Adjust transparency here (0 for fully transparent, 1 for opaque)
        }}
      >
      </Box>
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
