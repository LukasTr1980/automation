import Layout from '../Layout';
import { Box, Button, Grid } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <Layout title="Automation" showBackButton={false} showLogo={true}>
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
    </Layout>
  );
};

export default HomePage;
