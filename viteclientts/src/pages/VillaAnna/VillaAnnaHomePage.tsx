import { 
  Box, 
  Card, 
  CardActionArea, 
  CardContent, 
  Grid, 
  Typography, 
  useMediaQuery, 
  useTheme,
  Avatar,
  Chip,
  Stack
} from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import { 
  WaterDrop, 
  Schedule, 
  ThermostatAuto,
  PlayArrow,
  Pause,
  OpacityOutlined
} from '@mui/icons-material';
import { useState, useEffect } from 'react';

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [et0Data, setEt0Data] = useState<{ et0_week: number | null; unit: string } | null>(null);
  const [temperatureData, setTemperatureData] = useState<{ temperature: number | null; unit: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tempLoading, setTempLoading] = useState(true);

  // Mock data - replace with actual data from your irrigation system
  const systemStatus = {
    isRunning: false,
    nextScheduled: '08:00',
    lastRun: '06:30'
  };

  // Fetch ET₀ data
  useEffect(() => {
    const fetchEt0Data = async () => {
      try {
        const response = await fetch('/api/et0/latest');
        if (response.ok) {
          const data = await response.json();
          setEt0Data(data);
        } else {
          console.warn('Failed to fetch ET₀ data:', response.statusText);
          setEt0Data({ et0_week: null, unit: 'mm' });
        }
      } catch (error) {
        console.error('Error fetching ET₀ data:', error);
        setEt0Data({ et0_week: null, unit: 'mm' });
      } finally {
        setLoading(false);
      }
    };

    fetchEt0Data();
  }, []);

  // Fetch current temperature data
  useEffect(() => {
    const fetchTemperatureData = async () => {
      try {
        const response = await fetch('/api/weather/temperature');
        if (response.ok) {
          const data = await response.json();
          setTemperatureData(data);
        } else {
          console.warn('Failed to fetch temperature data:', response.statusText);
          setTemperatureData({ temperature: null, unit: 'C' });
        }
      } catch (error) {
        console.error('Error fetching temperature data:', error);
        setTemperatureData({ temperature: null, unit: 'C' });
      } finally {
        setTempLoading(false);
      }
    };

    fetchTemperatureData();
  }, []);

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            mb: 1,
            fontSize: { xs: '1.5rem', md: '2rem' }
          }}>
            Villa Anna Irrigation System
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'text.secondary',
            fontSize: { xs: '0.9rem', md: '1rem' }
          }}>
            Smart irrigation management and monitoring
          </Typography>
        </Box>

        {/* Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: 'white',
              height: '100%'
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      System Status
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {systemStatus.isRunning ? 'Active' : 'Standby'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    {systemStatus.isRunning ? <PlayArrow /> : <Pause />}
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              color: 'white',
              height: '100%'
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      ET₀ (7 days)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {loading ? '...' : (et0Data?.et0_week !== null && et0Data?.et0_week !== undefined) ? `${et0Data.et0_week} ${et0Data?.unit || 'mm'}` : 'N/A'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <OpacityOutlined />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
              color: 'white',
              height: '100%'
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Temperature
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {tempLoading ? '...' : (temperatureData?.temperature !== null && temperatureData?.temperature !== undefined) ? `${temperatureData.temperature}°${temperatureData?.unit || 'C'}` : 'N/A'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <ThermostatAuto />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
              color: 'white',
              height: '100%'
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Next Schedule
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {systemStatus.nextScheduled}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Schedule />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Cards */}
        <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 800, mx: 'auto' }}>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <RouterLink to="/bewaesserung" style={{ textDecoration: 'none' }}>
              <Card sx={{ 
                height: { xs: 200, md: 280 },
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                },
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(66, 165, 245, 0.1) 100%)',
                border: '1px solid rgba(25, 118, 210, 0.2)'
              }}>
                <CardActionArea sx={{ height: '100%' }}>
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    p: { xs: 2, md: 3 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Avatar sx={{ 
                      width: { xs: 60, md: 80 }, 
                      height: { xs: 60, md: 80 }, 
                      mx: 'auto', 
                      mb: 2,
                      bgcolor: 'primary.main',
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                    }}>
                      <WaterDrop sx={{ fontSize: { xs: 30, md: 40 } }} />
                    </Avatar>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 600, 
                      mb: 1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' }
                    }}>
                      Bewässerung
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      fontSize: { xs: '0.8rem', md: '0.9rem' }
                    }}>
                      Manual irrigation control and zone management
                    </Typography>
                    <Chip 
                      label="Manual Control" 
                      size="small" 
                      sx={{ mt: 2, bgcolor: 'primary.main', color: 'white' }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <RouterLink to="/countdown" style={{ textDecoration: 'none' }}>
              <Card sx={{ 
                height: { xs: 200, md: 280 },
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                },
                background: 'linear-gradient(135deg, rgba(123, 31, 162, 0.1) 0%, rgba(186, 104, 200, 0.1) 100%)',
                border: '1px solid rgba(123, 31, 162, 0.2)'
              }}>
                <CardActionArea sx={{ height: '100%' }}>
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    p: { xs: 2, md: 3 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Avatar sx={{ 
                      width: { xs: 60, md: 80 }, 
                      height: { xs: 60, md: 80 }, 
                      mx: 'auto', 
                      mb: 2,
                      background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)'
                    }}>
                      <Schedule sx={{ fontSize: { xs: 30, md: 40 } }} />
                    </Avatar>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 600, 
                      mb: 1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' }
                    }}>
                      {isSmallScreen ? 'Countdown' : 'Bewässerungs Timer'}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      fontSize: { xs: '0.8rem', md: '0.9rem' }
                    }}>
                      Scheduled irrigation with countdown timer
                    </Typography>
                    <Chip 
                      label="Automated" 
                      size="small" 
                      sx={{ mt: 2, bgcolor: '#7b1fa2', color: 'white' }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
        </Grid>

        {/* Quick Info */}
        <Box sx={{ 
          mt: 4, 
          p: { xs: 2, md: 3 }, 
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Quick Status
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Last irrigation: {systemStatus.lastRun} • Duration: 45 min
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Next scheduled: {systemStatus.nextScheduled} • Auto mode enabled
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Layout>
  );
};

export default HomePage;
