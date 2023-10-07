import { Link as RouterLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import { Container, Box, Grid, Typography } from '@mui/material';

const HomePage = () => {
  return (
    <Container>
      <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto' }}>
        <Grid container spacing={3} justify="center" alignItems="center">
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h3" align="center">Villa Anna</Typography>
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
                  to="/bewaesserung"
                  sx={{ my: 2, width: '200px' }} // set a width
                >
                  Bewässerung
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/markise"
                  sx={{ my: 2, width: '200px' }} // set the same width
                >
                  Markise
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/settings"
                  sx={{ my: 2, width: '200px' }}
                >
                  Settings
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage;
