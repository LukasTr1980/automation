import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import IrrigationButtonImage from '../../images/IrrigationButton.webp';
import IrrigationCountdownButtonImage from '../../images/IrrigationCountdownButton.webp';
import IrrigationButtonImageSmall from '../../images/IrrigationButton160x160.webp';
import IrrigationCountdownButtonImageSmall from '../../images/IrrigationCountdownButton160x160.webp';
import ImagePreloader from '../../utils/imagePreloader';

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const imageUrls = isSmallScreen ? [
    IrrigationButtonImageSmall,
    IrrigationCountdownButtonImageSmall
  ] : [
    IrrigationButtonImage,
    IrrigationCountdownButtonImage
  ];

  const cardMaxwidth = isSmallScreen ? { maxWidth: '160px' } : { maxWidth: '200px' };
  const cardMediaWidth = isSmallScreen ? '160px' : '200px';
  const cardMediaHeight = isSmallScreen ? '160px' : '200px';
  const typographyFontSize = isSmallScreen ? 16 : 20;

  return (
    <ImagePreloader imageUrls={imageUrls}>
      <Layout title='Villa Anna Automation'>
        <Grid container spacing={2} justifyContent="center" alignItems="center" paddingTop={1}>
          <Grid>
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
          <Grid>
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
        </Grid>
      </Layout>
    </ImagePreloader>
  );
};

export default HomePage;
