import { Typography, Box, Grid2 } from '@mui/material';
import Layout from '../Layout';

const NotFoundPage: React.FC = () => {
  return (
    <Layout title="404">
      <Grid2 size={12}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="subtitle1">Page not found</Typography>
        </Box>
      </Grid2>
    </Layout>
  );
}

export default NotFoundPage;
