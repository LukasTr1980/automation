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
  Skeleton
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
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
// Info icon rendered via InfoPopover component
import InfoPopover from '../../components/InfoPopover';
import { useState, useEffect, type ReactNode } from 'react';
import useSnackbar from '../../utils/useSnackbar';

// Small helper to render relative age in minutes with German label
function formatRelativeMinutes(ts: string): string {
  try {
    const ms = Date.now() - new Date(ts).getTime();
    const mins = Math.max(0, Math.round(ms / 60000));
    if (mins <= 0) return 'gerade eben';
    if (mins === 1) return 'vor 1 Minute';
    return `vor ${mins} Minuten`;
  } catch {
    return 'unbekannt';
  }
}

// Formats an ISO timestamp using German locale (short date + short time)
function formatDateTimeDE(ts: string | null | undefined): string {
  if (!ts) return 'unbekannt';
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return 'unbekannt';
  }
}

// Computes the local date range label for the last 7 full days ending yesterday
function formatLast7DaysRangeDE(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); // yesterday local
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
  return `Zeitraum: ${fmt.format(start)}–${fmt.format(end)} (lokal)`;
}

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { showSnackbar } = useSnackbar();
  // React Query: ET0 weekly
  const et0Query = useQuery<{ et0_week: number | null; unit: string }>(
    {
      queryKey: ['et0', 'latest'],
      queryFn: async () => {
        const r = await fetch('/api/et0/latest');
        if (!r.ok) throw new Error('ET0');
        return r.json();
      },
      staleTime: 60 * 60 * 1000, // 1h; recomputed daily
    }
  );
  // React Query: Weather latest + aggregates
  type WeatherLatestResponse = {
    latest?: { temperatureC?: number; humidity?: number; rainRateMmPerHour?: number; timestamp?: string };
    aggregates?: { timestamp?: string; meansTimestamp?: string };
  };
  const weatherQuery = useQuery<WeatherLatestResponse>({
    queryKey: ['weather', 'latest'],
    queryFn: async () => {
      const r = await fetch('/api/weather/latest');
      if (!r.ok) throw new Error('weather');
      return r.json();
    },
    staleTime: 2 * 60 * 1000, // 2m; backend cache updates every ~5m
  });
  // React Query: Next schedule
  const scheduleQuery = useQuery<{ nextScheduled: string; zone: string | null }>({
    queryKey: ['schedule', 'next'],
    queryFn: async () => {
      const r = await fetch('/api/schedule/next');
      if (!r.ok) throw new Error('schedule');
      return r.json();
    },
    staleTime: 60 * 1000, // 1m
  });
  // Derive values from weather query
  const latestTimestamp = weatherQuery.data?.latest?.timestamp ?? null;
  const aggregatesTimestamp = weatherQuery.data?.aggregates?.timestamp ?? null;
  const meansTimestamp = weatherQuery.data?.aggregates?.meansTimestamp ?? null;
  const cacheTimestamp = latestTimestamp;
  const cacheStale = (() => {
    if (!latestTimestamp) return true;
    const ageMs = Date.now() - new Date(latestTimestamp).getTime();
    return ageMs > 10 * 60 * 1000; // 10 minutes
  })();
  
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

  // Snackbar on query errors (German messages)
  useEffect(() => {
    if (et0Query.isError) showSnackbar('Fehler beim Laden der ET₀-Daten', 'error');
  }, [et0Query.isError, showSnackbar]);
  useEffect(() => {
    if (weatherQuery.isError) showSnackbar('Fehler beim Laden der Wetterdaten', 'error');
  }, [weatherQuery.isError, showSnackbar]);
  useEffect(() => {
    if (scheduleQuery.isError) showSnackbar('Fehler beim Laden des Zeitplans', 'error');
  }, [scheduleQuery.isError, showSnackbar]);

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
      <Box sx={{ px: { xs: 0, md: 0 }, py: { xs: 2, md: 3 }, width: '100%', mx: 'auto' }}>
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
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              minHeight: { xs: 110, md: 140 },
              overflow: 'visible'
            }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Blocker
                  <InfoPopover
                    ariaLabel="Mögliche Blocker"
                    content={'Mögliche Blocker: Ø-Temperatur ≤ 10 °C; Ø-Luftfeuchte ≥ 80 %; Regen (24h) ≥ 3 mm; Regenrate > 0 mm/h; Defizit < 5 mm'}
                    iconSize={16}
                  />
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
                        <Chip 
                          key="b-temp"
                          color="error" 
                          variant="filled" 
                          icon={<ThermostatAuto />} 
                          label="Ø-Temperatur ≤ 10 °C" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
                      );
                      if (humActive) chips.push(
                        <Chip 
                          key="b-hum"
                          color="error" 
                          variant="filled" 
                          icon={<OpacityOutlined />} 
                          label="Ø-Luftfeuchte ≥ 80 %" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
                      );
                      if (rain24Active) chips.push(
                        <Chip 
                          key="b-r24"
                          color="error" 
                          variant="filled" 
                          icon={<WaterDrop />} 
                          label="Regen (24h) ≥ 3 mm" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
                      );
                      if (rateActive) chips.push(
                        <Chip 
                          key="b-rate"
                          color="error" 
                          variant="filled" 
                          icon={<Speed />} 
                          label="Regenrate > 0" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
                      );
                      if (deficitActive) chips.push(
                        <Chip 
                          key="b-def"
                          color="error" 
                          variant="filled" 
                          icon={<TrendingDown />} 
                          label="Defizit < 5 mm" 
                          size="small"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block', lineHeight: 1.2, py: 0.25, overflowWrap: 'anywhere' } }}
                        />
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
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 100, md: 120 }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                        Verdunstung (7 Tage bis gestern)
                      </Typography>
                      <InfoPopover
                        ariaLabel="Zeitraum anzeigen"
                        content={formatLast7DaysRangeDE()}
                        iconSize={16}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                      {et0Query.isLoading
                        ? '...'
                        : (et0Query.data && et0Query.data.et0_week !== null && et0Query.data.et0_week !== undefined)
                          ? `${et0Query.data.et0_week} ${et0Query.data.unit || 'mm'}`
                          : 'k. A.'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main', color: 'common.white', width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, flexShrink: 0 }}>
                    <OpacityOutlined sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 100, md: 120 }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                      Temperatur (aktuell)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                      {weatherQuery.isLoading ? (
                        <Skeleton variant="text" width={60} />
                      ) : (typeof weatherQuery.data?.latest?.temperatureC === 'number')
                        ? `${weatherQuery.data.latest.temperatureC}°C`
                        : 'k. A.'}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main', color: 'common.white', width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, flexShrink: 0 }}>
                    <ThermostatAuto sx={{ fontSize: { xs: 18, md: 20 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
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
                      {scheduleQuery.isLoading ? '...' : scheduleQuery.data?.nextScheduled || 'Kein Zeitplan'}
                    </Typography>
                    {scheduleQuery.data?.zone && !scheduleQuery.isLoading && scheduleQuery.data.nextScheduled !== 'No schedule' && scheduleQuery.data.nextScheduled !== 'Scheduled' && (
                      <Typography variant="body2" sx={{ opacity: 0.8, fontSize: { xs: '0.65rem', md: '0.7rem' }, mt: 0.5 }}>
                        {scheduleQuery.data.zone}
                      </Typography>
                    )}
                  </Box>
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'common.white', width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, flexShrink: 0 }}>
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
              <Card variant="outlined" sx={{ 
                borderRadius: 2,
                height: { xs: 200, md: 280 },
                transition: 'background-color 0.2s ease',
                '&:hover': { backgroundColor: 'action.hover' }
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
                    <Avatar sx={{ width: { xs: 60, md: 80 }, height: { xs: 60, md: 80 }, mx: 'auto', mb: 2, bgcolor: 'primary.main', color: 'common.white' }}>
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
                    <Chip label="Manuelle Steuerung" size="small" sx={{ mt: 2, bgcolor: 'primary.main', color: 'common.white' }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <RouterLink to="/countdown" style={{ textDecoration: 'none' }}>
              <Card variant="outlined" sx={{ 
                borderRadius: 2,
                height: { xs: 200, md: 280 },
                transition: 'background-color 0.2s ease',
                '&:hover': { backgroundColor: 'action.hover' }
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
                    <Avatar sx={{ width: { xs: 60, md: 80 }, height: { xs: 60, md: 80 }, mx: 'auto', mb: 2, bgcolor: 'secondary.main', color: 'common.white' }}>
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
                    <Chip label="Automatisiert" size="small" sx={{ mt: 2, bgcolor: 'secondary.main', color: 'common.white' }} />
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
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, textAlign: { xs: 'center', sm: 'left' } }}>
            Schnellübersicht
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' } }}>
                {cacheStale && (
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                  Datenaktualität: {cacheTimestamp ? formatRelativeMinutes(cacheTimestamp) : 'unbekannt'}
                </Typography>
                <InfoPopover
                  ariaLabel="Zeitstempel anzeigen"
                  content={(() => {
                    if (!latestTimestamp && !aggregatesTimestamp) return 'Zeitpunkt unbekannt';
                    const aggDisplay = meansTimestamp ?? aggregatesTimestamp ?? cacheTimestamp;
                    if (latestTimestamp && aggDisplay && latestTimestamp !== aggDisplay) {
                      return `Aktuell: ${formatDateTimeDE(latestTimestamp)} • Aggregiert: ${formatDateTimeDE(aggDisplay)}`;
                    }
                    return `Stand: ${formatDateTimeDE(cacheTimestamp)}`;
                  })()}
                  iconSize={16}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                  Nächste Planung: {scheduleQuery.isLoading ? '...' : (scheduleQuery.data?.nextScheduled || 'Kein Zeitplan')} {scheduleQuery.data?.zone ? `• ${scheduleQuery.data.zone}` : '• Automatikmodus aktiviert'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Layout>
  );
};

export default HomePage;
