import Layout from '../Layout';
import { Grid, Card, CardActionArea, CardMedia, CardContent, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VillaAnnaButtonImage from '../images/VillaAnnaButton.jpeg';
import SettingsButtonImage from '../images/SettingsButton.jpg';
import { useUserStore } from '../utils/store';

const HomePage: React.FC = () => {
  const { role } = useUserStore();

  return (
    <Layout title="Automation">
      <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
        <Grid item>
          <RouterLink to="/villa-anna/home" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={VillaAnnaButtonImage}
                  alt='Irrigation Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Villa Anna
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </RouterLink>
        </Grid>
        {role === 'admin' && (
        <Grid item>
          <RouterLink to="/settings" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={SettingsButtonImage}
                  alt='Irrigation Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Settings
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </RouterLink>
        </Grid>
        )}
      </Grid>
    </Layout>
  );
};

export default HomePage;
