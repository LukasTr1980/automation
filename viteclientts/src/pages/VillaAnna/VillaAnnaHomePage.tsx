import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import IrrigationButtonImage from '../../images/IrrigationButton.webp';
import AwningButtonImage from '../../images/AwningButton.webp';
import IrrigationCountdownButtonImage from '../../images/IrrigationCountdownButton.webp';
import HeatingButtonImage from '../../images/HeatingButtonImage.webp';
import VentilationButtonImage from '../../images/VentilationButton.webp';
import axios from 'axios';
import { useUserStore } from '../../utils/store';
import useSnackbar from '../../utils/useSnackbar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ImagePreloader from '../../utils/imagePreloader';

const HomePage = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { userLogin, deviceId, setTokenAndExpiry } = useUserStore();
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const refreshToken = async (url: string) => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin, deviceId });
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
        window.open(url, "_blank");
      }
    } catch (error) {
      showSnackbar(t('invalidOrExpiredToken'), 'warning');
      navigate('/login');
    }
  };

  const openHeatingSystemUrl = () => {
    const heatingSystemUrl = 'https://charts.cx/heating-system/';
    refreshToken(heatingSystemUrl);
  };

  const openVentilationSystemUrl = () => {
    const ventilationSystemUrl = 'https://charts.cx/ventilation-system/';
    refreshToken(ventilationSystemUrl);
  }

  const imageUrls = [IrrigationButtonImage, AwningButtonImage, IrrigationCountdownButtonImage, HeatingButtonImage, VentilationButtonImage];

  return (
    <ImagePreloader imageUrls={imageUrls}>
    <Layout title='Villa Anna Automation'>
      <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
        <Grid item>
          <RouterLink to="/villa-anna/bewaesserung" style={{ textDecoration: 'none' }}>
            <Card sx={{ maxWidth: '200px' }} variant='outlined'>
              <CardActionArea>
                <CardMedia
                  component='img'
                  image={IrrigationButtonImage}
                  alt='Irrigation'
                  width='200px'
                  height='200px'
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
                  alt='Awning'
                  width='200px'
                  height='200px'
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
                  alt='Irrigation Countdown'
                  width='200px'
                  height='200px'
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
            <CardActionArea onClick={openHeatingSystemUrl}>
              <CardMedia
                component='img'
                image={HeatingButtonImage}
                alt='Heating'
                width='200px'
                height='200px'
              />
              <CardContent>
                <Typography gutterBottom variant="h6" component="div">
                  Heizung
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
          </Grid>
          <Grid item>
          <Card sx={{ maxWidth: '200px' }} variant='outlined'>
            <CardActionArea onClick={openVentilationSystemUrl}>
              <CardMedia
                component='img'
                image={VentilationButtonImage}
                alt='Ventilation'
                width='200px'
                height='200px'
              />
              <CardContent>
                <Typography gutterBottom variant="h6" component="div">
                  Lüftung
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Layout>
    </ImagePreloader>
  );
};

export default HomePage;
