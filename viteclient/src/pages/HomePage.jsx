import Layout from '../Layout';
import { Box } from '@mui/material';

const HomePage = () => {
  return (
    <Layout title="Automation" showBackButton={false}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '60vh',
          backgroundImage: 'url(../../public/images/background.png)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        {/* Optionally, any other content you want to overlay on the image */}
      </Box>
    </Layout>
  );
};

export default HomePage;
