import Layout from '../Layout';
import { Box, Grid, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <Layout title="Automation" showLogo={true}>
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Button
            to="/villa-anna/home"
            component={RouterLink}
            variant='contained'
            sx={{ width: '300px', my: 2 }}
          >
            Villa Anna
          </Button>
          <Button
            to="/settings"
            component={RouterLink}
            variant='contained'
            sx={{ width: '300px', my: 2 }}
          >
            Settings
          </Button>
        </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
