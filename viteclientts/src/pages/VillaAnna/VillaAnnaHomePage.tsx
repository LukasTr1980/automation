import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import IrrigationButtonImage from '../../images/IrrigationButton.webp';
import AwningButtonImage from '../../images/AwningButton.webp';
import IrrigationCountdownButtonImage from '../../images/IrrigationCountdownButton.webp';
import HeatingButtonImage from '../../images/HeatingButtonImage.webp';
import VentilationButtonImage from '../../images/VentilationButton.webp';
import IrrigationButtonImageSmall from '../../images/IrrigationButton160x160.webp';
import AwningButtonImageSmall from '../../images/AwningButton160x160.webp';
import HeatingButtonImageSmall from '../../images/HeatingButton160x160.webp';
import IrrigationCountdownButtonImageSmall from '../../images/IrrigationCountdownButton160x160.webp';
import VentilationButtonImageSmall from '../../images/VentilationButton160x160.webp';
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
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

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

  const imageUrls = isSmallScreen ? [
    IrrigationButtonImageSmall,
    AwningButtonImageSmall,
    IrrigationCountdownButtonImageSmall,
    HeatingButtonImageSmall,
    VentilationButtonImageSmall
  ] : [
    IrrigationButtonImage,
    AwningButtonImage,
    IrrigationCountdownButtonImage,
    HeatingButtonImage,
    VentilationButtonImage
  ];

  const cardMaxwidth = isSmallScreen ? { maxWidth: '160px' } : { maxWidth: '200px' };
  const cardMediaWidth = isSmallScreen ? '160px' : '200px';
  const cardMediaHeight = isSmallScreen ? '160px' : '200px';
  const typographyFontSize = isSmallScreen ? 16 : 20;

  return (
    <ImagePreloader imageUrls={imageUrls}>
      <Layout title='Villa Anna Automation'>
        <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
          <Grid item>
            <RouterLink to="/villa-anna/bewaesserung" style={{ textDecoration: 'none' }}>
              <Card sx={cardMaxwidth} variant='outlined'>
                <CardActionArea>
                  <CardMedia
                    component='img'
                    image={isSmallScreen ? IrrigationButtonImageSmall : IrrigationButtonImage}
                    alt='Irrigation'
                    width={cardMediaWidth}
                    height={cardMediaHeight}
                  />
                  <CardContent>
                    <Typography fontSize={typographyFontSize}>
                      Bewässerung
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          <Grid item>
            <RouterLink to="/villa-anna/markise" style={{ textDecoration: 'none' }}>
              <Card sx={cardMaxwidth} variant='outlined'>
                <CardActionArea>
                  <CardMedia
                    component='img'
                    image={isSmallScreen ? AwningButtonImageSmall : AwningButtonImage}
                    alt='Awning'
                    width={cardMediaWidth}
                    height={cardMediaHeight}
                  />
                  <CardContent>
                    <Typography fontSize={typographyFontSize}>
                      Markise
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          <Grid item>
            <RouterLink to="/villa-anna/countdown" style={{ textDecoration: 'none' }}>
              <Card sx={cardMaxwidth} variant='outlined'>
                <CardActionArea>
                  <CardMedia
                    component='img'
                    image={isSmallScreen ? IrrigationCountdownButtonImageSmall : IrrigationCountdownButtonImage}
                    alt='Irrigation Countdown'
                    width={cardMediaWidth}
                    height={cardMediaHeight}
                  />
                  <CardContent>
                    <Typography fontSize={typographyFontSize}>
                      {isSmallScreen ? 'Countdown' : 'Bew. Countdown'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          <Grid item>
            <Card sx={cardMaxwidth} variant='outlined'>
              <CardActionArea onClick={openHeatingSystemUrl}>
                <CardMedia
                  component='img'
                  image={isSmallScreen ? HeatingButtonImageSmall : HeatingButtonImage}
                  alt='Heating'
                  width={cardMediaWidth}
                  height={cardMediaHeight}
                />
                <CardContent>
                  <Typography fontSize={typographyFontSize}>
                    Heizung
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item>
            <Card sx={cardMaxwidth} variant='outlined'>
              <CardActionArea onClick={openVentilationSystemUrl}>
                <CardMedia
                  component='img'
                  image={isSmallScreen ? VentilationButtonImageSmall : VentilationButtonImage}
                  alt='Ventilation'
                  width={cardMediaWidth}
                  height={cardMediaHeight}
                />
                <CardContent>
                  <Typography fontSize={typographyFontSize}>
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
