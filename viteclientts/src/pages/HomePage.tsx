import Layout from '../Layout';
import { Grid, Card, CardActionArea, CardMedia, CardContent, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VillaAnnaButtonImage from '../images/VillaAnnaButton.webp';
import VillaAnnaButtonImageSmall from '../images/VillaAnnaButton160x160.webp';
import SettingsButtonImageSmall from '../images/SettingsButton160x160.webp';
import SettingsButtonImage from '../images/SettingsButton.webp';
import { useUserStore } from '../utils/store';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import ImagePreloader from '../utils/imagePreloader';

const HomePage: React.FC = () => {
  const { userLogin } = useUserStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (userLogin === 'Stefan') {
      navigate('/villa-anna/home');
    }
  },[userLogin, navigate]);

  const imageUrls = isSmallScreen ? [VillaAnnaButtonImageSmall, SettingsButtonImageSmall] : [VillaAnnaButtonImage, SettingsButtonImage];

  const cardMaxwidth = isSmallScreen ? { maxWidth: '160px' } : { maxWidth: '200px' };
  const cardMediaWidth = isSmallScreen ? '160px' : '200px';
  const cardMediaHeight = isSmallScreen ? '160px' : '200px';
  const typographyFontSize = isSmallScreen ? 16 : 20;

  return (
    <ImagePreloader imageUrls={imageUrls}>
    <Layout title="Automation">
      <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
        <Grid item>
          <RouterLink to="/villa-anna/home" style={{ textDecoration: 'none' }}>
            <Card sx={ cardMaxwidth} variant='outlined'>
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
        {userLogin === 'admin' && (
        <Grid item>
          <RouterLink to="/settings" style={{ textDecoration: 'none' }}>
            <Card sx={ cardMaxwidth} variant='outlined'>
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
