import { Typography, Box, Grid } from '@mui/material';
import Layout from '../Layout';

const NotFoundPage: React.FC = () => {
  return (
    <Layout title="404">
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="subtitle1">Page not found</Typography>
        </Box>
      </Grid>
    </Layout>
  );
}

export default NotFoundPage;
