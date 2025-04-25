import Layout from '../Layout';
import { Grid, Card, CardActionArea, CardMedia, CardContent, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VillaAnnaButtonImage from '../images/VillaAnnaButton.webp';
import VillaAnnaButtonImageSmall from '../images/VillaAnnaButton160x160.webp';
import SettingsButtonImageSmall from '../images/SettingsButton160x160.webp';
import SettingsButtonImage from '../images/SettingsButton.webp';
import ChatgptButtonImage from '../images/ChatgptButton-200x200.webp';
import ChatgptButtonImageSmall from '../images/ChatgptButton-160x160.webp';
import { useUserStore } from '../utils/store';
import { useTranslation } from 'react-i18next';
import ImagePreloader from '../utils/imagePreloader';
import axios from 'axios';
import useSnackbar from '../utils/useSnackbar';

const HomePage: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const { userLogin, deviceId, setTokenAndExpiry } = useUserStore();
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

  const openChatbotUrl = () => {
    const chatbotUrl = 'https://nextchat.charts.cx';
    refreshToken(chatbotUrl);
  }

  const imageUrls = isSmallScreen ? [VillaAnnaButtonImageSmall, SettingsButtonImageSmall, ChatgptButtonImageSmall] : [VillaAnnaButtonImage, SettingsButtonImage, ChatgptButtonImage];

  const cardMaxwidth = isSmallScreen ? { maxWidth: '160px' } : { maxWidth: '200px' };
  const cardMediaWidth = isSmallScreen ? '160px' : '200px';
  const cardMediaHeight = isSmallScreen ? '160px' : '200px';
  const typographyFontSize = isSmallScreen ? 16 : 20;

  return (
    <ImagePreloader imageUrls={imageUrls}>
      <Layout title="Automation">
        <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
          <Grid>
            <RouterLink to="/villa-anna/home" style={{ textDecoration: 'none' }}>
              <Card sx={cardMaxwidth} variant='outlined'>
                <CardActionArea>
                  <CardMedia
                    component='img'
                    image={isSmallScreen ? VillaAnnaButtonImageSmall : VillaAnnaButtonImage}
                    alt='Villa Anna'
                    width={cardMediaWidth}
                    height={cardMediaHeight}
                  />
                  <CardContent>
                    <Typography fontSize={typographyFontSize}>
                      Villa Anna
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          <Grid>
            <Card sx={cardMaxwidth} variant='outlined'>
              <CardActionArea onClick={openChatbotUrl}>
                <CardMedia
                  component='img'
                  image={isSmallScreen ? ChatgptButtonImageSmall : ChatgptButtonImage}
                  alt='Chatbot'
                  width={cardMediaWidth}
                  height={cardMediaHeight}
                />
                <CardContent>
                  <Typography fontSize={typographyFontSize}>
                    Chatbot
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          {userLogin === 'admin' && (
            <Grid>
              <RouterLink to="/settings" style={{ textDecoration: 'none' }}>
                <Card sx={cardMaxwidth} variant='outlined'>
                  <CardActionArea>
                    <CardMedia
                      component='img'
                      image={isSmallScreen ? SettingsButtonImageSmall : SettingsButtonImage}
                      alt='Settings'
                      width={cardMediaWidth}
                      height={cardMediaHeight}
                    />
                    <CardContent>
                      <Typography fontSize={typographyFontSize}>
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
    </ImagePreloader>
  );
};

export default HomePage;
