import { Container, Typography, Box, Grid } from '@mui/material';
import BackButton from './components/BackButton'; // adjust the path based on where your BackButton component is located

function NotFoundPage() {
  return (
    <Container>
      <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto' }}>
        <Grid container spacing={3} justify="center" alignItems="center">
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ alignSelf: 'flex-start' }}>
                <BackButton />
              </Box>
              <Typography variant="h1">404</Typography>
              <Typography variant="subtitle1">Page not found</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default NotFoundPage;
