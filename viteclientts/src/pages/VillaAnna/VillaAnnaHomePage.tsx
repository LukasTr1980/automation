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
  LinearProgress
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../Layout';
import { Link as RouterLink } from 'react-router-dom';
import { 
  WaterDrop, 
  Schedule, 
  Block,
  Inventory2Outlined,
  Waves as WavesIcon
} from '@mui/icons-material';
// Info icon rendered via InfoPopover component
import InfoPopover from '../../components/InfoPopover';
import FreshnessStatus from '../../components/FreshnessStatus';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import useSnackbar from '../../utils/useSnackbar';
import { switchDescriptions, bewaesserungsTopics, bewaesserungsTopicsSet, zoneOrder } from '../../components/constants';
import { type CountdownsState } from '../../types/types';
import IrrigationIndicator from '../../components/IrrigationIndicator';
import ForecastCard from '../../components/ForecastCard';

// Timing thresholds / intervals
const WEATHER_REFETCH_MS = 2 * 60 * 1000; // 2 minutes

// Freshness formatting is handled inside FreshnessStatus component

// formatDateTimeDE moved into FreshnessStatus

// Compute local label for yesterday's date
function formatYesterdayDE(): string {
  const now = new Date();
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
  return `Datum: ${fmt.format(y)} (lokal)`;
}

const HomePage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Lightweight status chip with small colored dot + short label
  const DotLabel = ({ color, label }: { color: string; label: string }) => (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, lineHeight: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flex: '0 0 auto' }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Box>
  );

  const { showSnackbar } = useSnackbar();
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  // React Query: ET0 daily (yesterday)
  const et0YesterdayQuery = useQuery<{ date: string; et0mm: number | null; unit?: string }>(
    {
      queryKey: ['et0', 'yesterday'],
      queryFn: async () => {
        const r = await fetch('/api/et0/yesterday');
        if (!r.ok) throw new Error('ET0');
        return r.json();
      },
      staleTime: 60 * 60 * 1000, // 1h; recomputed daily
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
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
    // Periodically refetch to keep the snapshot fresh even without tab blur/focus
    refetchInterval: WEATHER_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  // React Query: Last irrigation (from Influx)
  const lastIrrigationQuery = useQuery<{ last: { timestamp: string; zone?: string | null; zoneLabel?: string | null } | null }>(
    {
      queryKey: ['irrigation', 'last'],
      queryFn: async () => {
        const r = await fetch('/api/irrigation/last');
        if (!r.ok) throw new Error('irrigation_last');
        return r.json();
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
    }
  );
  // React Query: Next schedule
  const scheduleQuery = useQuery<{ nextScheduled: string; zone: string | null }>({
    queryKey: ['schedule', 'next'],
    queryFn: async () => {
      const r = await fetch('/api/schedule/next');
      if (!r.ok) throw new Error('schedule');
      return r.json();
    },
    staleTime: 60 * 1000, // 1m
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  // Derive values from weather query
  const latestTimestamp = weatherQuery.data?.latest?.timestamp ?? null;
  const aggregatesTimestamp = weatherQuery.data?.aggregates?.timestamp ?? null;
  const meansTimestamp = weatherQuery.data?.aggregates?.meansTimestamp ?? null;

  // Server-side freshness dot (Redis snapshot age)
  // Freshness UI handled by FreshnessStatus
  
  // Decision metrics (from SSE) for blockers
  interface DecisionMetrics {
    outTemp: number;
    humidity: number;
    rainToday: number;
    rainRate: number;
    rainNextDay?: number;
    rainProbNextDay?: number;
    effectiveForecast?: number;
    // Soil-bucket primary trigger
    soilStorageMm?: number;
    tawMm?: number;
    depletionMm?: number;
    triggerMm?: number;
    soilUpdatedAt?: string;
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
    if (et0YesterdayQuery.isError) showSnackbar('Fehler beim Laden der ET₀-Daten', 'error');
  }, [et0YesterdayQuery.isError, showSnackbar]);
  useEffect(() => {
    if (weatherQuery.isError) showSnackbar('Fehler beim Laden der Wetterdaten', 'error');
  }, [weatherQuery.isError, showSnackbar]);
  useEffect(() => {
    if (scheduleQuery.isError) showSnackbar('Fehler beim Laden des Zeitplans', 'error');
  }, [scheduleQuery.isError, showSnackbar]);
  useEffect(() => {
    if (lastIrrigationQuery.isError) showSnackbar('Fehler beim Laden der Bewässerungshistorie', 'error');
  }, [lastIrrigationQuery.isError, showSnackbar]);

  // Instant refresh on tab/window focus and when page becomes visible
  // (SSE re-subscribe is wired below via startSSE)
  useEffect(() => {
    const onFocus = () => {
      weatherQuery.refetch();
      scheduleQuery.refetch();
      et0YesterdayQuery.refetch();
      startSSE();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [weatherQuery.refetch, scheduleQuery.refetch, et0YesterdayQuery.refetch]);

  // SSE for irrigation decision + switches, with ability to re-subscribe on focus
  const sseRef = useRef<EventSource | null>(null);
  const startSSE = () => {
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    const es = new EventSource(`${apiUrl}/mqtt`);
    sseRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.latestStates) {
          const initial = bewaesserungsTopics.map((topic) => data.latestStates[topic] === 'true');
          setSwitches(initial);
        } else if (data?.type === 'switchState') {
          const idx = bewaesserungsTopics.indexOf(data.topic);
          if (idx !== -1) {
            setSwitches((prev) => prev.map((v, i) => (i === idx ? data.state === 'true' : v)));
          }
          // Do not auto-refresh S on manual switch; wait for explicit 'irrigationStart' event
        } else if (data?.type === 'irrigationNeeded' && data.response) {
          const r = data.response;
          setDecision({
            outTemp: r.outTemp,
            humidity: r.humidity,
            rainToday: r.rainToday,
            rainRate: r.rainRate,
            rainNextDay: r.rainNextDay,
            rainProbNextDay: r.rainProbNextDay,
            effectiveForecast: r.effectiveForecast,
            soilStorageMm: r.soilStorageMm,
            tawMm: r.tawMm,
            depletionMm: r.depletionMm,
            triggerMm: r.triggerMm,
            soilUpdatedAt: r.soilUpdatedAt,
          });
          setDecisionLoading(false);
        } else if (data?.type === 'irrigationStart' && data?.source === 'scheduled') {
          // Scheduled irrigation just started → refresh soil bucket immediately
          setTimeout(() => startSSE(), 150);
        }
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      setDecisionLoading(false);
    };
  };
  useEffect(() => {
    startSSE();
    return () => { if (sseRef.current) try { sseRef.current.close(); } catch {}; };
  }, [apiUrl]);

  // Periodic refresh: re-subscribe every 2 minutes to keep soil bucket fresh without manual reload
  useEffect(() => {
    const id = setInterval(() => {
      startSSE();
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <Box sx={{ px: { xs: 0, md: 0 }, py: { xs: 2, md: 3 }, width: '100%', mx: 'auto' }}>
        {/* Header Section */}
        <Box sx={{ mb: { xs: 2, md: 4 } }}>
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
        <Grid
          container
          rowSpacing={{ xs: 1, md: 3 }}
          columnSpacing={{ xs: 1, md: 3 }}
          sx={{ mb: { xs: 2, md: 3 } }}
        >
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 },
              position: 'relative'
            }}>
              {decisionLoading && (
                <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
              )}
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
                    content={`Mögliche Blocker: Ø-Temperatur ≤ 10 °C; Ø-Luftfeuchte ≥ 80 %; Regen (24h) ≥ 3 mm; Regenrate > 0 mm/h; Entzug < Startschwelle (≈ ${(decision?.triggerMm ?? 0).toFixed?.(0) ?? decision?.triggerMm ?? 0} mm)`}
                    iconSize={16}
                  />
                </Typography>
                {decisionLoading ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', pt: 0.5, minHeight: { xs: 28, md: 32 } }}>
                    {/* reserved space while loading; no skeletons to avoid CLS */}
                  </Box>
                ) : decision ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', minHeight: { xs: 28, md: 32 } }}>
                    {(() => {
                      const items: ReactNode[] = [];
                      const tempActive = decision.outTemp <= 10;
                      const humActive = decision.humidity >= 80;
                      const rain24Active = decision.rainToday >= 3;
                      const rateActive = decision.rainRate > 0;
                      const drynessActive = typeof decision.depletionMm === 'number' && typeof decision.triggerMm === 'number' && decision.depletionMm < decision.triggerMm;
                      if (tempActive) items.push(
                        <DotLabel key="b-temp" color={theme.palette.error.main} label="Temp ≤ 10 °C" />
                      );
                      if (humActive) items.push(
                        <DotLabel key="b-hum" color={theme.palette.error.main} label="Feuchte ≥ 80 %" />
                      );
                      if (rain24Active) items.push(
                        <DotLabel key="b-r24" color={theme.palette.error.main} label="Regen 24h ≥ 3 mm" />
                      );
                      if (rateActive) items.push(
                        <DotLabel key="b-rate" color={theme.palette.error.main} label="Regenrate > 0" />
                      );
                      if (drynessActive) items.push(
                        <DotLabel key="b-dry" color={theme.palette.error.main} label={`Entzug < Startschwelle`} />
                      );
                      return items.length ? items : [
                        <DotLabel key="b-none" color={theme.palette.success.main} label="Keine Blocker" />
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
          
          {/* Removed Verdunstung card from top per AGENTS.md dashboard integration */}

          {/* Soil storage snapshot */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 },
              position: 'relative'
            }}>
              {decisionLoading && (
                <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
              )}
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'success.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <Inventory2Outlined sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Boden‑Speicher
                  </Typography>
                  <InfoPopover
                    ariaLabel="Hinweis zum Boden‑Speicher"
                    content={`Speicher 0–Kapazität (Kappung). Kapazität = ${decision?.tawMm?.toFixed?.(0) ?? 'k. A.'} mm. Startschwelle ≈ ${typeof decision?.triggerMm === 'number' ? decision!.triggerMm!.toFixed(1) : 'k. A.'} mm. S ist die aktuell verfügbare Bodenfeuchte.`}
                    iconSize={16}
                  />
                </Box>
                <Box sx={{ width: '100%', maxWidth: 240, px: 2 }}>
                  {(() => {
                    const s = decision?.soilStorageMm;
                    const cap = decision?.tawMm;
                    const pct = (typeof s === 'number' && typeof cap === 'number' && cap > 0)
                      ? Math.max(0, Math.min(100, (s / cap) * 100))
                      : null;
                    return (
                      <>
                        <LinearProgress
                          variant={pct === null ? 'indeterminate' : 'determinate'}
                          value={pct ?? undefined}
                          aria-label="Füllstand Boden‑Speicher"
                          sx={{ height: 8, borderRadius: 5, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                          {typeof s === 'number' && typeof cap === 'number' ? (
                            <Box component="span" sx={{ display: 'inline-block', minWidth: '10ch', fontVariantNumeric: 'tabular-nums' }}>
                              {s.toFixed(1)} mm / {cap.toFixed(0)} mm
                            </Box>
                          ) : (
                            <Box component="span" sx={{ color: 'text.secondary' }}>k. A.</Box>
                          )}
                        </Typography>
                        {/* Status chips (z. B. "Nicht trocken genug") entfernt – Redundanz mit Blocker-Anzeige */}
                        {/* Boden‑Speicher Aktualisierungshinweis wurde in die Schnellübersicht (Freshness) verschoben */}
                      </>
                    );
                  })()}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 },
              position: 'relative'
            }}>
              {(et0YesterdayQuery.isFetching || weatherQuery.isFetching) && (
                <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
              )}
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'info.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <WavesIcon sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Verdunstung (gestern)
                  </Typography>
                  <InfoPopover ariaLabel="Zeitraum anzeigen" content={formatYesterdayDE()} iconSize={16} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }} aria-live="polite">
                  {(() => {
                    const hasNumber = typeof et0YesterdayQuery.data?.et0mm === 'number';
                    const text = hasNumber ? `${et0YesterdayQuery.data!.et0mm} ${et0YesterdayQuery.data!.unit || 'mm'}` : 'k. A.';
                    return (
                      <Box component="span" sx={{ display: 'inline-block', minWidth: '6ch', fontVariantNumeric: 'tabular-nums' }}>
                        {(et0YesterdayQuery.isLoading && !hasNumber) ? '–' : text}
                      </Box>
                    );
                  })()}
                </Typography>
                {/* Secondary metric: current temperature */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Temperatur (aktuell)
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }} aria-live="polite">
                    {(() => {
                      const hasNumber = typeof weatherQuery.data?.latest?.temperatureC === 'number';
                      return hasNumber
                        ? `${weatherQuery.data!.latest!.temperatureC}°C`
                        : (weatherQuery.isLoading ? '–' : 'k. A.');
                    })()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ 
              borderRadius: 2,
              height: '100%',
              minHeight: { xs: 140, md: 160 },
              position: 'relative'
            }}>
              {scheduleQuery.isFetching && (
                <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
              )}
              <CardContent sx={{ height: '100%', textAlign: 'center', display: 'grid', gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' }, justifyItems: 'center', rowGap: 0.75 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', color: 'common.white', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 }, alignSelf: 'center' }}>
                  <Schedule sx={{ fontSize: { xs: 26, md: 30 } }} />
                </Avatar>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Nächster Zeitplan
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }} aria-live="polite">
                  {(() => {
                    const text = scheduleQuery.data?.nextScheduled || 'Kein Zeitplan';
                    return (
                      <Box component="span" sx={{ display: 'inline-block', minWidth: '14ch' }}>
                        {scheduleQuery.isLoading && !scheduleQuery.data ? '–' : text}
                      </Box>
                    );
                  })()}
                </Typography>
                <Box sx={{ minHeight: 24 }}>
                  {scheduleQuery.data?.zone && scheduleQuery.data.nextScheduled !== 'No schedule' && scheduleQuery.data.nextScheduled !== 'Scheduled' && (
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
                      {scheduleQuery.data.zone}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Wetterprognose (morgen) */}
          <Grid size={{ xs: 12, md: 3 }}>
            <ForecastCard
              loading={decisionLoading}
              rainNextDay={decision?.rainNextDay ?? null}
              rainProbNextDay={decision?.rainProbNextDay ?? null}
              effectiveForecast={decision?.effectiveForecast ?? null}
            />
          </Grid>
        </Grid>

        {/* Schnellübersicht: outlined Card, compact and responsive */}
        <Card variant="outlined" sx={{ mt: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <CardContent sx={{ pt: 2 }}>
            <Typography component="h2" variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, textAlign: { xs: 'center', sm: 'left' } }}>
              Schnellübersicht
            </Typography>

            {/* Top: Frische | Bewässerungsstatus | Letzte Bewässerung */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '1.05fr 0.95fr 1.4fr',
              },
              columnGap: { xs: 0, md: 2 },
              rowGap: { xs: 1, md: 0 },
              alignItems: 'stretch',
            }}>
              {/* Freshness */}
              <Box sx={{ py: { xs: 0, md: 0.5 }, pr: { md: 2 } }}>
                <FreshnessStatus
                  latestTimestamp={latestTimestamp}
                  aggregatesTimestamp={aggregatesTimestamp}
                  meansTimestamp={meansTimestamp}
                  soilUpdatedAt={decision?.soilUpdatedAt ?? null}
                  clientIsFetching={weatherQuery.isFetching}
                  clientIsError={weatherQuery.isError as boolean}
                  clientUpdatedAt={weatherQuery.dataUpdatedAt}
                />
              </Box>

              {/* Irrigation status (dot + label + zones) */}
              <Box sx={{
                py: { xs: 1, md: 0.5 },
                px: { md: 2 },
                borderLeft: { md: '1px solid' },
                borderRight: { md: '1px solid' },
                borderTop: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: { xs: 'flex-start', md: 'center' },
                flexDirection: { xs: 'row', md: 'row' },
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: { xs: 0.75, md: 1 },
                minWidth: 0,
              }}>
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
                  const zonesTitle = allActive.length ? `Zonen: ${allActive.join(', ')}` : undefined;
                  const zonesInline = allActive.join(', ');
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, md: 1 }, minWidth: 0 }}>
                      <IrrigationIndicator
                        running={isRunning}
                        ariaLabel={isRunning ? 'Bewässerung läuft' : 'Bewässerung gestoppt'}
                        title={zonesTitle}
                        size={isSmallScreen ? 30 : 32}
                      />
                      {!isRunning && (
                        <Box sx={{ flex: '0 0 auto' }}>
                          <DotLabel color={theme.palette.text.disabled} label={'Gestoppt'} />
                        </Box>
                      )}
                      {isRunning && zonesInline && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            ml: 0.25,
                            minWidth: 0,
                          }}
                        >
                          {zonesInline}
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
              </Box>

              {/* Last irrigation (wrap gracefully, never cut off) */}
              <Box sx={{
                py: { xs: 1, md: 0.5 },
                pl: { md: 2 },
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                minWidth: 0,
                gap: 0.75,
                borderTop: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
              }}>
                <WaterDrop sx={{ color: 'info.main', fontSize: 18, flex: '0 0 auto', mr: 0.75 }} aria-hidden />
                <Box sx={{ minWidth: 0 }}>
                  {lastIrrigationQuery.isLoading ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Lade letzte Bewässerung…</Typography>
                  ) : lastIrrigationQuery.data?.last ? (
                    <>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
                        Letzte Bewässerung
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}
                        title={(() => {
                          const t = new Date(lastIrrigationQuery.data!.last!.timestamp);
                          return new Intl.DateTimeFormat('de-DE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(t);
                        })()}
                      >
                        {(() => {
                          const t = new Date(lastIrrigationQuery.data!.last!.timestamp);
                          const dt = new Intl.DateTimeFormat('de-DE', { year: 'numeric', day: '2-digit', month: '2-digit' }).format(t);
                          const tm = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(t);
                          const zl = lastIrrigationQuery.data!.last!.zoneLabel ?? null;
                          return zl ? `${dt}, ${tm} – ${zl}` : `${dt}, ${tm}`;
                        })()}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Letzte Bewässerung: Keine Aufzeichnungen</Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Bottom section entfernt: Entzug/Startschwelle zieht in Boden‑Speicher Info */}
          </CardContent>
        </Card>

        {/* Action Cards */}
        <Grid
          container
          rowSpacing={{ xs: 1.5, md: 3 }}
          columnSpacing={{ xs: 1, md: 3 }}
          justifyContent="center"
          sx={{ maxWidth: 800, mx: 'auto' }}
        >
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
