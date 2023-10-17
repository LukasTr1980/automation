import { Link as RouterLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import { Box, Grid } from '@mui/material';
import Layout from '../../Layout';

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
              p: 4,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/villa-anna/bewaesserung"
              sx={{ my: 2, width: '200px' }} // set a width
            >
              Bewässerung
            </Button>
            <Button
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/villa-anna/markise"
              sx={{ my: 2, width: '200px' }} // set the same width
            >
              Markise
            </Button>
          </Box>
      </Grid>
    </Layout>
  );
};

export default HomePage;
