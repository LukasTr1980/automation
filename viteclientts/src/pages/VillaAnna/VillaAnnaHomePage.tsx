import { Box, Button, Grid } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';

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
          <Button
            component={RouterLink}
            to="/villa-anna/bewaesserung"
            style={{ fontSize: '18px', margin: '10px' }}
          >
            Bewässerung
          </Button>
          <Button
            component={RouterLink}
            to="/villa-anna/markise"
            style={{ fontSize: '18px', margin: '10px' }}
          >
            Markise
          </Button>
          <Button
            component={RouterLink}
            to="/villa-anna/countdown"
            style={{ fontSize: '18px', margin: '10px' }}
          >
            Countdown
          </Button>
        </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
