import Layout from '../Layout';
import { Box, Grid } from '@mui/material';
import CustomButton from '../components/Button';

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
          }}
        >
          <CustomButton
            to="/villa-anna/home"
            customWidth={{ xs: '311px', sm: '311px' }}
          >
            Villa Anna
          </CustomButton>
          <CustomButton
            to="/settings"
            customWidth={{ xs: '311px', sm: '311px' }}
          >
            Settings
          </CustomButton>
        </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
