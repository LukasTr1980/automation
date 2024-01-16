import Layout from '../Layout';
import { Box, Button, Grid } from '@mui/material';
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
          component={RouterLink}
          to="/villa-anna/home"
          style={{ fontSize: '18px', margin: '10px' }}
          >
            Villa Anna
          </Button>
          <Button 
          component={RouterLink}
          to="/settings"
          style={{ fontSize: '18px', margin: '10px' }}
          >
            Settings
          </Button>
        </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
