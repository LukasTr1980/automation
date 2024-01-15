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
            variant='contained'
            to="/villa-anna/bewaesserung"
            sx={{ width: '300px', my: 2 }}
          >
            Bewässerung
          </Button>
          <Button
            variant='contained'
            component={RouterLink}
            to="/villa-anna/markise"
            sx={{ width: '300px', my: 2 }}
          >
            Markise
          </Button>
          <Button
            component={RouterLink}
            to="/villa-anna/countdown"
            variant='contained'
            sx={{ width: '300px', my: 2 }}
          >
            Countdown
          </Button>
        </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
