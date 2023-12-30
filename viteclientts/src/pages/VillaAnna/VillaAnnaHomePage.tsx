import { Box, Grid } from '@mui/material';
import Layout from '../../Layout';
import CustomButton from '../../components/Button';

const HomePage = () => {
  return (
    <Layout title='Villa Anna Automation' showBackButton={false} showLogo={true}>
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
              to="/villa-anna/bewaesserung"
            >
              Bewässerung
            </CustomButton>
            <CustomButton
              to="/villa-anna/markise"
            >
              Markise
            </CustomButton>
            <CustomButton
              to="/villa-anna/countdown"
            >
              Countdown
            </CustomButton>
          </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
