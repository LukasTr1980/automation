import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography } from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import IrrigationButtonImage from '../../images/IrrigationButton.jpg';
import AwningButtonImage from '../../images/AwningButton.jpg';
import IrrigationCountdownButtonImage from '../../images/IrrigationCountdownButton.jpg';

const HomePage = () => {
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
      </Grid>
    </Layout>
  );
};

export default HomePage;
