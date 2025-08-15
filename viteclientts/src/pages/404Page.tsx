import { Typography, Box, Grid } from '@mui/material';
import Layout from '../Layout';

const NotFoundPage: React.FC = () => {
  return (
    <Layout>
      <Grid size={12}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="subtitle1">Seite nicht gefunden</Typography>
        </Box>
      </Grid>
    </Layout>
  );
}

export default NotFoundPage;
