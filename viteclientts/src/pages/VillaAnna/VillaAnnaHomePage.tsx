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
  Stack,
  Tooltip,
  Skeleton
} from '@mui/material';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import { 
  WaterDrop, 
  Schedule, 
  ThermostatAuto,
  OpacityOutlined,
  Speed,
  TrendingDown
} from '@mui/icons-material';
import { useState, useEffect, type ReactNode } from 'react';

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [et0Data, setEt0Data] = useState<{ et0_week: number | null; unit: string } | null>(null);
  const [temperatureData, setTemperatureData] = useState<{ temperature: number | null; unit: string } | null>(null);
  const [scheduleData, setScheduleData] = useState<{ nextScheduled: string; zone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tempLoading, setTempLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  
  // Decision metrics (from SSE) for blockers
  interface DecisionMetrics {
    outTemp: number;
    humidity: number;
    rainToday: number;
    rainRate: number;
    deficitNow: number;
  }
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [decision, setDecision] = useState<DecisionMetrics | null>(null);

  // Mock data - replace with actual data from your irrigation system
  const systemStatus = {
    isRunning: false,
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

  // Fetch next schedule data
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const response = await fetch('/api/schedule/next');
        if (response.ok) {
          const data = await response.json();
          setScheduleData(data);
        } else {
          console.warn('Failed to fetch schedule data:', response.statusText);
          setScheduleData({ nextScheduled: 'No schedules', zone: null });
        }
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        setScheduleData({ nextScheduled: 'Error', zone: null });
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchScheduleData();
  }, []);

  // Subscribe to SSE for irrigation decision to derive blockers
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const es = new EventSource(`${apiUrl}/mqtt`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'irrigationNeeded' && data.response) {
          const r = data.response;
          setDecision({
            outTemp: r.outTemp,
            humidity: r.humidity,
            rainToday: r.rainToday,
            rainRate: r.rainRate,
            deficitNow: r.deficitNow,
          });
          setDecisionLoading(false);
        }
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      // stop loading on error to avoid spinner lock
      setDecisionLoading(false);
    };
    return () => {
      es.close();
    };
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
            Villa Anna Bewässerungssystem
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'text.secondary',
            fontSize: { xs: '0.9rem', md: '1rem' }
          }}>
            Intelligente Bewässerungssteuerung und Überwachung
          </Typography>
        </Box>

        {/* Status Cards */
        /* Left card: show active blockers (from SSE) instead of fake system status */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: 'white',
              minHeight: { xs: 110, md: 140 },
              overflow: 'visible'
            }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem', mb: 0.5 }}>
                  Blocker
                </Typography>
                {decisionLoading ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pt: 0.5 }}>
                    <Skeleton variant="rounded" width={120} height={28} />
                    <Skeleton variant="rounded" width={140} height={28} />
                    <Skeleton variant="rounded" width={110} height={28} />
                  </Box>
                ) : decision ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(() => {
                      const chips: ReactNode[] = [];
                      const tempActive = decision.outTemp <= 10;
                      const humActive = decision.humidity >= 80;
                      const rain24Active = decision.rainToday >= 3;
                      const rateActive = decision.rainRate > 0;
                      const deficitActive = decision.deficitNow < 5;
                      if (tempActive) chips.push(
                        <Tooltip title={`Ø-Temperatur 7 Tage: ${decision.outTemp.toFixed(1)} °C`} key="b-temp">
                          <Chip 
                            color="error" 
                            variant="filled" 
                            icon={<ThermostatAuto />} 
                            label="Ø-Temperatur ≤ 10 °C" 
                            size="small"
                            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                          />
                        </Tooltip>
                      );
                      if (humActive) chips.push(
                        <Tooltip title={`Ø-Luftfeuchte 7 Tage: ${decision.humidity.toFixed(0)} %`} key="b-hum">
                          <Chip 
                            color="error" 
                            variant="filled" 
                            icon={<OpacityOutlined />} 
                            label="Ø-Luftfeuchte ≥ 80 %" 
                            size="small"
                            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                          />
                        </Tooltip>
                      );
                      if (rain24Active) chips.push(
                        <Tooltip title={`Regen (24h): ${decision.rainToday.toFixed(1)} mm`} key="b-r24">
                          <Chip 
                            color="error" 
                            variant="filled" 
                            icon={<WaterDrop />} 
                            label="Regen (24h) ≥ 3 mm" 
                            size="small"
                            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                          />
                        </Tooltip>
                      );
                      if (rateActive) chips.push(
                        <Tooltip title={`Regenrate: ${decision.rainRate.toFixed(1)} mm/h`} key="b-rate">
                          <Chip 
                            color="error" 
                            variant="filled" 
                            icon={<Speed />} 
                            label="Regenrate > 0" 
                            size="small"
                            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                          />
                        </Tooltip>
                      );
                      if (deficitActive) chips.push(
                        <Tooltip title={`Wasserdefizit: ${decision.deficitNow.toFixed(1)} mm`} key="b-def">
                          <Chip 
                            color="error" 
                            variant="filled" 
                            icon={<TrendingDown />} 
                            label="Defizit < 5 mm" 
                            size="small"
                            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                          />
                        </Tooltip>
                      );
                      return chips.length ? chips : [
                        <Chip 
                          key="b-none" 
                          color="success" 
                          variant="outlined" 
                          label="Keine Blocker aktiv" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
                      ];
                    })()}
                  </Box>
                ) : (
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                    Keine Daten
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #039be5 0%, #81d4fa 100%)',
              color: 'white',
              height: '100%',
              minHeight: { xs: 100, md: 120 }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Verdunstung 7 Tage
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                      {loading ? '...' : (et0Data?.et0_week !== null && et0Data?.et0_week !== undefined) ? `${et0Data.et0_week} ${et0Data?.unit || 'mm'}` : 'k. A.'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: { xs: 36, md: 40 }, 
                    height: { xs: 36, md: 40 },
                    flexShrink: 0
                  }}>
                    <OpacityOutlined sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
              color: 'white',
              height: '100%',
              minHeight: { xs: 100, md: 120 }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Temperatur
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                      {tempLoading ? (
                        <Skeleton variant="text" width={60} />
                      ) : (temperatureData?.temperature !== null && temperatureData?.temperature !== undefined) ? `${temperatureData.temperature}°${temperatureData?.unit || 'C'}` : 'k. A.'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: { xs: 36, md: 40 }, 
                    height: { xs: 36, md: 40 },
                    flexShrink: 0
                  }}>
                    <ThermostatAuto sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
              color: 'white',
              height: '100%',
              minHeight: { xs: 100, md: 120 }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Nächster Zeitplan
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                      {scheduleLoading ? '...' : scheduleData?.nextScheduled || 'Kein Zeitplan'}
                    </Typography>
                    {scheduleData?.zone && !scheduleLoading && scheduleData.nextScheduled !== 'No schedule' && scheduleData.nextScheduled !== 'Scheduled' && (
                      <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', md: '0.7rem' }, mt: 0.5 }}>
                        {scheduleData.zone}
                      </Typography>
                    )}
                  </Box>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: { xs: 36, md: 40 }, 
                    height: { xs: 36, md: 40 },
                    flexShrink: 0
                  }}>
                    <Schedule sx={{ fontSize: { xs: 18, md: 20 } }} />
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
                      Manuelle Bewässerungssteuerung und Zonenverwaltung
                    </Typography>
                    <Chip 
                      label="Manuelle Steuerung" 
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
                      Geplante Bewässerung mit Countdown-Timer
                    </Typography>
                    <Chip 
                      label="Automatisiert" 
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
            Schnellübersicht
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Letzte Bewässerung: {systemStatus.lastRun} • Dauer: 45 Min
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Nächste Planung: {scheduleLoading ? '...' : (scheduleData?.nextScheduled || 'Kein Zeitplan')} {scheduleData?.zone ? `• ${scheduleData.zone}` : '• Automatikmodus aktiviert'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Layout>
  );
};

export default HomePage;
