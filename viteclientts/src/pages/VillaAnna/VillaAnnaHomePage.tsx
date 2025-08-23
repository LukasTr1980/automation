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
  TrendingDown,
  Block
} from '@mui/icons-material';
// Info icon rendered via InfoPopover component
import InfoPopover from '../../components/InfoPopover';
import { useState, useEffect, type ReactNode } from 'react';
import useSnackbar from '../../utils/useSnackbar';
import { switchDescriptions, bewaesserungsTopics, bewaesserungsTopicsSet, zoneOrder } from '../../components/constants';
import { type CountdownsState } from '../../types/types';
import IrrigationIndicator from '../../components/IrrigationIndicator';

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
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
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

  // Track live switch states (manual/automatic on) via SSE
  const [switches, setSwitches] = useState<boolean[]>([false, false, false, false, false]);

  // React Query: poll current countdowns (lightweight)
  const countdownsQuery = useQuery<CountdownsState>({
    queryKey: ['countdowns', 'current'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/countdown/currentCountdowns`);
      if (!res.ok) throw new Error('countdowns');
      return res.json();
    },
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

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
    const es = new EventSource(`${apiUrl}/mqtt`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.latestStates) {
          // Initial switch states
          const initial = bewaesserungsTopics.map((topic) => data.latestStates[topic] === 'true');
          setSwitches(initial);
        } else if (data?.type === 'switchState') {
          // Incremental switch state updates
          const idx = bewaesserungsTopics.indexOf(data.topic);
          if (idx !== -1) {
            setSwitches((prev) => prev.map((v, i) => (i === idx ? data.state === 'true' : v)));
          }
        } else if (data?.type === 'irrigationNeeded' && data.response) {
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
            mb: 1
          }}>
            Villa Anna Bewässerungssystem
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'text.secondary'
          }}>
            Intelligente Bewässerungssteuerung und Überwachung
          </Typography>
        </Box>

        {/* Status Cards */
        /* Left card: show active blockers (from SSE) instead of fake system status */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 }
            }}>
              <CardContent
                sx={{
                  height: '100%',
                  display: 'grid',
                  gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' },
                  justifyItems: 'center',
                  rowGap: 0.75,
                  textAlign: 'center'
                }}
              >
                <Avatar sx={{ bgcolor: 'error.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <Block sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Typography variant="body2" sx={{ opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  Blocker
                  <InfoPopover
                    ariaLabel="Mögliche Blocker"
                    content={'Mögliche Blocker: Ø-Temperatur ≤ 10 °C; Ø-Luftfeuchte ≥ 80 %; Regen (24h) ≥ 3 mm; Regenrate > 0 mm/h; Defizit < 5 mm'}
                    iconSize={16}
                  />
                </Typography>
                {decisionLoading ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', pt: 0.5 }}>
                    <Skeleton variant="rounded" width={120} height={28} />
                    <Skeleton variant="rounded" width={140} height={28} />
                    <Skeleton variant="rounded" width={110} height={28} />
                  </Box>
                ) : decision ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
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
              minHeight: { xs: 140, md: 160 }
            }}>
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'info.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <OpacityOutlined sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Verdunstung (7 Tage bis gestern)
                  </Typography>
                  <InfoPopover
                    ariaLabel="Zeitraum anzeigen"
                    content={formatLast7DaysRangeDE()}
                    iconSize={16}
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {et0Query.isLoading
                    ? '...'
                    : (et0Query.data && et0Query.data.et0_week !== null && et0Query.data.et0_week !== undefined)
                      ? `${et0Query.data.et0_week} ${et0Query.data.unit || 'mm'}`
                      : 'k. A.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 }
            }}>
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'warning.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <ThermostatAuto sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Temperatur (aktuell)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {weatherQuery.isLoading ? (
                    <Skeleton variant="text" width={60} />
                  ) : (typeof weatherQuery.data?.latest?.temperatureC === 'number')
                    ? `${weatherQuery.data.latest.temperatureC}°C`
                    : 'k. A.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 }
            }}>
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <Schedule sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Nächster Zeitplan
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  {scheduleQuery.isLoading ? '...' : scheduleQuery.data?.nextScheduled || 'Kein Zeitplan'}
                </Typography>
                {scheduleQuery.data?.zone && !scheduleQuery.isLoading && scheduleQuery.data.nextScheduled !== 'No schedule' && scheduleQuery.data.nextScheduled !== 'Scheduled' && (
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
                    {scheduleQuery.data.zone}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Info (moved above action cards for visibility) */}
        <Box sx={{ 
          mt: 2, 
          mb: 3,
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
            {/* Live irrigation status with animated indicator (replaces duplicate next-schedule) */}
            {(() => {
              const activeSwitchNames = switches
                .map((on, i) => (on ? switchDescriptions[i] : null))
                .filter(Boolean) as string[];
              const countdowns = countdownsQuery.data || {};
              const activeCountdownEntries = Object.entries(countdowns)
                .filter(([_, c]) => !!c && c!.control?.toLowerCase() === 'start' && (c!.value ?? 0) > 0);
              const activeCountdownIndices = activeCountdownEntries
                .map(([topic]) => bewaesserungsTopicsSet.indexOf(topic))
                .filter((i) => i >= 0);
              const activeCountdownNames: string[] = activeCountdownIndices
                .map((idx) => zoneOrder[idx] || switchDescriptions[idx] || String(idx));
              const allActive = Array.from(new Set([...activeSwitchNames, ...activeCountdownNames]));
              const isRunning = allActive.length > 0;
              const hasCountdown = activeCountdownNames.length > 0;
              const zonesTitle = allActive.length ? `Zonen: ${allActive.join(', ')}` : undefined;

              return (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      justifyContent: { xs: 'center', sm: 'flex-start' },
                      flexWrap: { xs: 'wrap', md: 'nowrap' },
                    }}
                  >
                    <IrrigationIndicator running={isRunning} ariaLabel={isRunning ? 'Bewässerung läuft' : 'Bewässerung gestoppt'} title={zonesTitle} />
                    <Chip
                      size="small"
                      variant={isRunning ? 'filled' : 'outlined'}
                      color={isRunning ? 'success' : 'default'}
                      label={isRunning ? (hasCountdown ? 'Countdown aktiv' : 'Läuft') : 'Gestoppt'}
                      sx={{ fontWeight: 600, mr: 0.5 }}
                    />
                    {(() => {
                      const activeByIndex = new Set<number>();
                      switches.forEach((on, i) => { if (on) activeByIndex.add(i); });
                      activeCountdownIndices.forEach((i) => activeByIndex.add(i));
                      const timeByIndex = new Map<number, number>();
                      activeCountdownEntries.forEach(([topic, c]) => {
                        const idx = bewaesserungsTopicsSet.indexOf(topic);
                        if (idx >= 0 && c) timeByIndex.set(idx, c.value);
                      });
                      const fmt = (s: number) => {
                        const hrs = Math.floor(s / 3600);
                        const mins = Math.floor((s % 3600) / 60);
                        const secs = s % 60;
                        if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        return `${mins}:${String(secs).padStart(2, '0')}`;
                      };
                      return Array.from(activeByIndex.values()).map((i) => {
                        const zoneName = zoneOrder[i] || switchDescriptions[i] || `Zone ${i+1}`;
                        const t = timeByIndex.get(i);
                        const isCountdown = typeof t === 'number' && t > 0;
                        return (
                          <Chip
                            key={`zone-${i}`}
                            size="small"
                            variant="outlined"
                            label={
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isCountdown ? 'info.main' : 'success.main' }} />
                                <span>{zoneName}{isCountdown ? ` · ${fmt(t!)}` : ''}</span>
                              </Box>
                            }
                            sx={{ '& .MuiChip-label': { px: 1 } }}
                          />
                        );
                      });
                    })()}
                  </Box>
                </Grid>
              );
            })()}
          </Grid>
        </Box>

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
                      mb: 1
                    }}>
                      Bewässerung
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                      mb: 1
                    }}>
                      {isSmallScreen ? 'Countdown' : 'Bewässerungs Timer'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Geplante Bewässerung mit Countdown-Timer
                    </Typography>
                    <Chip label="Automatisiert" size="small" sx={{ mt: 2, bgcolor: 'secondary.main', color: 'common.white' }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </RouterLink>
          </Grid>
        </Grid>

        
      </Box>
    </Layout>
  );
};

export default HomePage;
