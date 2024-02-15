import Layout from '../Layout';
import { Grid, Card, CardActionArea, CardMedia, CardContent, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VillaAnnaButtonImage from '../images/VillaAnnaButton.jpeg';
import SettingsButtonImage from '../images/SettingsButton.jpg';
import { useUserStore } from '../utils/store';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const HomePage: React.FC = () => {
  const { userLogin } = useUserStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (userLogin === 'test') {
      navigate('/villa-anna/home');
    }
  },[userLogin, navigate]);

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
        {userLogin === 'admin' && (
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
                    {t('settings')}
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
