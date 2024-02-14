import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import IrrigationButtonImage from '../../images/IrrigationButton.jpg';
import AwningButtonImage from '../../images/AwningButton.jpg';
import IrrigationCountdownButtonImage from '../../images/IrrigationCountdownButton.jpg';
import HeatingButtonImage from '../../images/HeatingButtonImage.webp';
import axios from 'axios';
import { useUserStore } from '../../utils/store';
import useSnackbar from '../../utils/useSnackbar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { userLogin, deviceId, setTokenAndExpiry } = useUserStore();
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, {username: userLogin, deviceId});
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
        window.open("https://charts.cx/heating-system/", "_blank");
      }
    } catch (error) {
      showSnackbar(t('invalidOrExpiredToken'), 'warning');
      navigate('/login');
    }
  };

  return (
    <Layout title='Villa Anna Automation'>
      <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
        <Grid item>
          <RouterLink to="/villa-anna/bewaesserung" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={IrrigationButtonImage}
                  alt='Irrigation Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Bewässerung
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </RouterLink>
        </Grid>
        <Grid item>
          <RouterLink to="/villa-anna/markise" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={AwningButtonImage}
                  alt='Irrigation Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Markise
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </RouterLink>
        </Grid>
        <Grid item>
          <RouterLink to="/villa-anna/countdown" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={IrrigationCountdownButtonImage}
                  alt='Irrigation Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Bew. Countdown
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </RouterLink>
        </Grid>
        <Grid item>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea onClick={refreshToken}>
                <CardMedia
                  component='img'
                  image={HeatingButtonImage}
                  alt='Heating Button'
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Heizung
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default HomePage;
