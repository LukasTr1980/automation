import { Box, Grid } from '@mui/material';
import Layout from '../../Layout';
import CustomButton from '../../components/Button';

const HomePage = () => {
  return (
    <Layout title='Villa Anna Automation' showLogo={true}>
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
              customWidth={{ xs: '311px', sm: '311px' }}
            >
              Bewässerung
            </CustomButton>
            <CustomButton
              to="/villa-anna/markise"
              customWidth={{ xs: '311px', sm: '311px' }}
            >
              Markise
            </CustomButton>
            <CustomButton
              to="/villa-anna/countdown"
              customWidth={{ xs: '311px', sm: '311px' }}
            >
              Countdown
            </CustomButton>
          </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
