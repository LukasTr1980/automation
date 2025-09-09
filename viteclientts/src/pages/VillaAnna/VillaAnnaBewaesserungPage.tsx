import { useState, useEffect, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { switchDescriptions, bewaesserungsTopics, zoneOrder, bewaesserungsTopicsSet } from '../../components/constants';
import ScheduledTaskCard from '../../components/ScheduledTaskCard';
import SchedulerCard from '../../components/SchedulerCard';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Switch,
  CircularProgress,
  Divider,
  LinearProgress
} from '@mui/material';
import ThermostatAutoIcon from '@mui/icons-material/ThermostatAuto';
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SpeedIcon from '@mui/icons-material/Speed';
// WaterIcon removed; irrigation weekly sum no longer shown
import WavesIcon from '@mui/icons-material/Waves';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
// Info icon rendered via InfoPopover component
import InfoPopover from '../../components/InfoPopover';
import Layout from '../../Layout';
import useSnackbar from '../../utils/useSnackbar';
import { GroupedTasks, ScheduledTask, APIResponse } from '../../types/types';
// Tabs removed in favor of shared ZoneSelector
import { ZoneSelector } from '../../components/index';
import { messages } from '../../utils/messages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FreshnessStatus from '../../components/FreshnessStatus';
// Dialog removed: details shown inline

// Timing intervals
const WEATHER_REFETCH_MS = 2 * 60 * 1000; // 2 minutes

const BewaesserungPage = () => {
  const queryClient = useQueryClient();
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [skipDecision, setSkipDecision] = useState(false);
  const [selectedTasksTopic, setSelectedTasksTopic] = useState<string | null>(null);
  const [switchesLoading, setSwitchesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [switches, setSwitches] = useState([false, false, false, false, false]);
  const [toggling, setToggling] = useState<boolean[]>([false, false, false, false, false]);
  const [, setirrigationNeededSwitch] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [orderedTasks, setOrderedTasks] = useState<GroupedTasks>({});
  const apiUrl = import.meta.env.VITE_API_URL;
  interface DecisionMetrics {
    outTemp: number;
    humidity: number;
    rainToday: number;
    rainRate: number;
    rainNextDay: number;
    rainProbNextDay: number;
    tawMm: number;
    soilStorageMm?: number;
    depletionMm?: number;
    triggerMm?: number;
    // Timestamp when soil-bucket was last updated (for FreshnessStatus)
    soilUpdatedAt?: string;
    // weekly ET₀ removed from payload/UI
    effectiveForecast: number;
    blockers: string[];
  }

  const [response, setResponse] = useState<DecisionMetrics | null>(null);
  const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
  const { showSnackbar } = useSnackbar();
  // Dialog state removed

  // React Query: Weather latest (+aggregates) for freshness display
  type WeatherLatestResponse = {
    latest?: { timestamp?: string };
    aggregates?: { timestamp?: string; meansTimestamp?: string };
  };
  const weatherQuery = useQuery<WeatherLatestResponse>({
    queryKey: ['weather', 'latest'],
    queryFn: async () => {
      const r = await fetch('/api/weather/latest');
      if (!r.ok) throw new Error('weather');
      return r.json();
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: WEATHER_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  const latestTimestamp = weatherQuery.data?.latest?.timestamp ?? null;
  const aggregatesTimestamp = weatherQuery.data?.aggregates?.timestamp ?? null;
  const meansTimestamp = weatherQuery.data?.aggregates?.meansTimestamp ?? null;
  // Freshness UI handled by FreshnessStatus

  // React Query: ET0 daily (yesterday)
  const et0YesterdayQuery = useQuery<{ date: string; et0mm: number | null; unit?: string }>({
    queryKey: ['et0', 'yesterday'],
    queryFn: async () => {
      const r = await fetch('/api/et0/yesterday');
      if (!r.ok) throw new Error('et0');
      return r.json();
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    if (et0YesterdayQuery.isError) showSnackbar('Fehler beim Laden der ET₀-Daten', 'error');
  }, [et0YesterdayQuery.isError, showSnackbar]);

  // Helper: label for last 7 full local days (yesterday back 7 days)
  const sevenDayFullRangeLabel = (() => {
    try {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(midnight);
      end.setDate(end.getDate() - 1); // yesterday
      const start = new Date(midnight);
      start.setDate(start.getDate() - 7); // 7 full days back
      const fmt = (d: Date) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
      return `${fmt(start)}–${fmt(end)}`;
    } catch {
      return '';
    }
  })();

  // Helper: label for yesterday (local)
  const yesterdayLabel = (() => {
    try {
      const now = new Date();
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(y);
    } catch {
      return '';
    }
  })();

  // SSE wiring with ability to resubscribe on demand (e.g., on focus)
  const sseRef = useRef<EventSource | null>(null);
  const startSSE = () => {
    // Close any existing connection first
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    const params = new URLSearchParams();
    if (skipDecision) params.set('checkIrrigation', 'false');
    const url = `${apiUrl}/mqtt?${params.toString()}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.latestStates) {
          const initialSwitchStates = bewaesserungsTopics.map((topic) => data.latestStates[topic] === 'true');
          setSwitches(initialSwitchStates);
          setSwitchesLoading(false);
        } else if (data.type === 'switchState') {
          const index = bewaesserungsTopics.indexOf(data.topic);
          if (index !== -1) {
            setSwitches((prev) => prev.map((val, i) => (i === index ? data.state === 'true' : val)));
          }
        } else if (data.type === 'irrigationNeeded') {
          setirrigationNeededSwitch(data.state);
          setResponse(data.response);
          setDecisionLoading(false);
        }
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      // if error, mark loading false to avoid spinners; will refresh on focus
      setDecisionLoading(false);
    };
  };
  useEffect(() => {
    startSSE();
    return () => { if (sseRef.current) try { sseRef.current.close(); } catch {}; };
  }, [apiUrl, skipDecision]);

  // Load initial decision-skip state from backend
  // React Query: decisionCheck (initial state)
  const decisionCheckQuery = useQuery<{ skip?: boolean }>({
    queryKey: ['decisionCheck'],
    queryFn: async () => {
      const r = await fetch(`${apiUrl}/decisionCheck`);
      if (!r.ok) throw new Error('decisionCheck');
      return r.json();
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    if (typeof decisionCheckQuery.data?.skip !== 'undefined') {
      setSkipDecision(!!decisionCheckQuery.data.skip);
    }
  }, [decisionCheckQuery.data]);

  // React Query: scheduledTasks
  const scheduledTasksQuery = useQuery<APIResponse>({
    queryKey: ['scheduledTasks'],
    queryFn: async () => {
      const r = await fetch(`${apiUrl}/scheduledTasks`);
      if (!r.ok) throw new Error('scheduledTasks');
      return r.json();
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    if (!scheduledTasksQuery.data) return;
    const tasksArray = Object.entries(scheduledTasksQuery.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
    const bewaesserungTasks = tasksArray.filter(task => task.topic.startsWith('bewaesserung')) as ScheduledTask[];
    setScheduledTasks(bewaesserungTasks);

    const groupedTasksLocal = bewaesserungTasks.reduce<GroupedTasks>((groups, task) => {
      const topicIndex = bewaesserungsTopicsSet.indexOf(task.topic);
      const zoneName = switchDescriptions[topicIndex];
      if (!groups[zoneName]) groups[zoneName] = [];
      groups[zoneName].push(task as ScheduledTask);
      groups[zoneName].sort((a, b) => Number(b.state) - Number(a.state));
      return groups;
    }, {});

    const orderedTasksLocal = zoneOrder.reduce<GroupedTasks>((ordered, zone) => {
      if (groupedTasksLocal[zone]) ordered[zone] = groupedTasksLocal[zone];
      return ordered;
    }, {});
    setOrderedTasks(orderedTasksLocal);
    setTasksLoading(false);
  }, [scheduledTasksQuery.data]);

  const handleToggle = (index: number) => {
    const newSwitchState = switches.map((val, i) => (i === index ? !val : val));
    setSwitches(newSwitchState);
    setToggling(prev => prev.map((v, i) => (i === index ? true : v)));

    axios.post(`${apiUrl}/simpleapi`, {
      topic: bewaesserungsTopicsSet[index],
      state: newSwitchState[index],
    })
      .then(response => {
          const backendMessageKey = response.data;
          const translatedMessage = messages[backendMessageKey] || backendMessageKey;
          showSnackbar(translatedMessage);
      })
      .catch(error => console.error('Error:', error))
      .finally(() => {
        setToggling(prev => prev.map((v, i) => (i === index ? false : v)));
      });
  };

  const handleDeleteTask = (taskId: string) => {
    setScheduledTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
  };

  // Selected zone for "Eingestellte Zeitpläne": keep as MQTT topic for consistency
  const tasksZones = Object.keys(orderedTasks);
  const tasksZoneTopics = tasksZones.map((zoneName) => {
    const idx = switchDescriptions.findIndex((desc) => desc === zoneName);
    return idx >= 0 ? bewaesserungsTopicsSet[idx] : zoneName;
  });

  useEffect(() => {
    if (!selectedTasksTopic && tasksZoneTopics.length > 0) {
      setSelectedTasksTopic(tasksZoneTopics[0]);
    } else if (selectedTasksTopic && tasksZoneTopics.length > 0 && !tasksZoneTopics.includes(selectedTasksTopic)) {
      // Previously selected topic no longer present -> reset to first available
      setSelectedTasksTopic(tasksZoneTopics[0]);
    }
  }, [selectedTasksTopic, tasksZoneTopics.join('|')]);

  // Instant refresh on focus/visibility
  useEffect(() => {
    const onFocus = () => {
      decisionCheckQuery.refetch();
      scheduledTasksQuery.refetch();
      weatherQuery.refetch();
      // Re-subscribe to SSE to force fresh Prüfpunkte snapshot
      startSSE();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [decisionCheckQuery.refetch, scheduledTasksQuery.refetch, weatherQuery.refetch, skipDecision, apiUrl]);

  // Dialog handlers removed

  return (
    <Layout>
      {/* Page container aligned with HomePage and Layout gutters */}
      <Box sx={{ px: { xs: 0, md: 0 }, py: { xs: 2, md: 3 }, width: '100%', mx: 'auto' }}>
        {/* Header aligned with HomePage */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              mb: 1
            }}
          >
            Bewässerung
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: 'text.secondary' }}
          >
            Manuelle Steuerung und Zeitpläne
          </Typography>
        </Box>

        <Grid size={12}>
          <Card variant='outlined' sx={{ borderRadius: 2, position: 'relative' }}>
            <CardHeader
              title={'Schalter'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            {switchesLoading && (
              <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
            )}
            <CardContent>
              <Box role="group" aria-label="Zonensteuerung">
                <Grid container spacing={{ xs: 1, sm: 1.5 }} columns={{ xs: 12, sm: 12, md: 5 }}>
                  {switches.map((isOn, i) => {
                    const labelId = `zone-pill-${i}`;
                    const isBusy = toggling[i] || switchesLoading;
                    return (
                      <Grid key={i} size={{ xs: 12, sm: 6, md: 1 }}>
                        <Box
                          sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: { xs: 'row', md: 'column' },
                            alignItems: { xs: 'center', md: 'flex-start' },
                            gap: 0.75,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            px: 1,
                            py: 0.5,
                            minHeight: 36,
                            '&:hover': { backgroundColor: 'action.hover' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: { xs: 'auto', md: '100%' } }}>
                            <Box
                              component="span"
                              aria-hidden
                              sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isOn ? 'success.main' : 'text.disabled' }}
                            />
                            <Typography
                              id={labelId}
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                whiteSpace: { xs: 'nowrap', md: 'normal' },
                                overflow: { xs: 'hidden', md: 'visible' },
                                textOverflow: { xs: 'ellipsis', md: 'clip' },
                              }}
                            >
                              {switchDescriptions[i]}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: { xs: 'auto', md: 0 }, mt: { md: 0.25 } }}>
                            {isBusy && <CircularProgress size={12} thickness={6} aria-label="Wird geschaltet" />}
                            <Switch
                              size="small"
                              checked={isOn}
                              onChange={() => handleToggle(i)}
                              disabled={isBusy}
                              sx={{ m: 0 }}
                              slotProps={{ input: { 'aria-labelledby': labelId } }}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12} sx={{ mt: 2 }}>
          <Card variant='outlined' sx={{ borderRadius: 2, position: 'relative' }}>
            <CardHeader
              title={'Smarte Entscheidung'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            {decisionLoading && (
              <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
            )}
            <CardContent>
              {/* Freshness rows (Wetterstation + Client) */}
              <FreshnessStatus
                latestTimestamp={latestTimestamp}
                aggregatesTimestamp={aggregatesTimestamp}
                meansTimestamp={meansTimestamp}
                soilUpdatedAt={response?.soilUpdatedAt ?? null}
                clientIsFetching={weatherQuery.isFetching}
                clientIsError={weatherQuery.isError as boolean}
                clientUpdatedAt={weatherQuery.dataUpdatedAt}
              />
              {skipDecision ? (
                <Grid container spacing={2} justifyContent="space-between">
                  <Grid size={12}>
                    <Typography>Entscheidungsprüfung deaktiviert</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Button
                      variant='outlined'
                      onClick={async () => {
                        const newVal = false;
                        try {
                          await fetch(`${apiUrl}/decisionCheck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: newVal }) });
                          setSkipDecision(newVal);
                          setDecisionLoading(true);
                          setResponse(null);
                          showSnackbar('Entscheidungsprüfung aktiviert');
                          queryClient.invalidateQueries({ queryKey: ['decisionCheck'] });
                        } catch (err) {
                          console.error(err);
                          showSnackbar('Fehler');
                        }
                      }}
                      fullWidth
                      color='primary'
                    >
                      Entscheidungsprüfung aktivieren
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={2} justifyContent="space-between">
                  {decisionLoading ? (
                    <Grid size={12}>
                      <Box sx={{ minHeight: 180 }} />
                    </Grid>
                  ) : (
                    <>
                      {response && (
                        <Grid size={12}>
                          <Box mt={1} sx={{ backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 1, p: 1.5, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom align="center">
                              Prüfpunkte
                            </Typography>
                          <List dense sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', '& li': { py: 0.5, width: '100%', maxWidth: 520 } }}>
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><ThermostatAutoIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Ø-Temperatur (7 Tage bis gestern)`}
                                  secondary={`${response.outTemp.toFixed(1)} °C`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                {sevenDayFullRangeLabel && (
                                  <InfoPopover
                                    ariaLabel="Zeitraum anzeigen"
                                    content={`Zeitraum: ${sevenDayFullRangeLabel} (lokal)`}
                                    iconSize={16}
                                  />
                                )}
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><OpacityOutlinedIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Ø-Luftfeuchte (7 Tage bis gestern)`}
                                  secondary={`${response.humidity.toFixed(0)} %`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                {sevenDayFullRangeLabel && (
                                  <InfoPopover
                                    ariaLabel="Zeitraum anzeigen"
                                    content={`Zeitraum: ${sevenDayFullRangeLabel} (lokal)`}
                                    iconSize={16}
                                  />
                                )}
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WaterDropIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Regen (24h)`}
                                secondary={`${response.rainToday.toFixed(1)} mm`}
                                slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><SpeedIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Regenrate (aktuell)`}
                                secondary={`${response.rainRate.toFixed(1)} mm/h`}
                                slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                              />
                            </ListItem>
                            {/* Removed: 7-day rain sum (not used) */}
                            {/* Removed: capped 7‑day rain + forecast (not used) */}
                            {/* Weekly ET₀ removed: not used by decision */}
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WavesIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Verdunstung (gestern)`}
                                  secondary={`${typeof et0YesterdayQuery.data?.et0mm === 'number' ? et0YesterdayQuery.data!.et0mm.toFixed(1) : 'k. A.'} mm`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                {yesterdayLabel && (
                                  <InfoPopover
                                    ariaLabel="Datum anzeigen"
                                    content={`Datum: ${yesterdayLabel} (lokal)`}
                                    iconSize={16}
                                  />
                                )}
                              </Box>
                            </ListItem>
                            {/* Wasserdefizit intentionally not displayed per UI guidance */}
                            {/* Soil bucket metrics (optional) */}
                            {typeof response.soilStorageMm === 'number' && typeof response.depletionMm === 'number' && (
                              <>
                                <Divider component="li" />
                                <ListItem>
                                  <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><Inventory2OutlinedIcon color="action" /></ListItemIcon>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                    <ListItemText
                                      primary={`Boden-Speicher (S / Kapazität)`}
                                      secondary={`${response.soilStorageMm.toFixed(1)} mm / ${response.tawMm.toFixed(0)} mm`}
                                      slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                    />
                                    <InfoPopover
                                      ariaLabel="Hinweis zum Boden-Speicher"
                                      content={`Speicher 0–Kapazität (Kappung). Kapazität = ${response.tawMm.toFixed(0)} mm. S ist die aktuell verfügbare Bodenfeuchte.`}
                                      iconSize={16}
                                    />
                                  </Box>
                                </ListItem>
                                <Divider component="li" />
                                <ListItem>
                                  <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><Inventory2OutlinedIcon color={'action'} /></ListItemIcon>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                    <ListItemText
                                      primary={`Entzug / Startschwelle`}
                                      secondary={`${response.depletionMm.toFixed(1)} mm / ${(response.triggerMm ?? 0).toFixed(1)} mm`}
                                      slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                    />
                                    <InfoPopover
                                      ariaLabel="Hinweis zum Entzug"
                                      content={`Entzug = Kapazität − S. Bewässerung ab Entzug ≥ Startschwelle. Kapazität = ${response.tawMm.toFixed(0)} mm.`}
                                      iconSize={16}
                                    />
                                  </Box>
                                </ListItem>
                              </>
                            )}
                          </List>
                          {/* Blockers section */}
                          <Box mt={2}>
                            <Typography variant="subtitle1" gutterBottom align="center" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              Blocker Aktiv
                              <InfoPopover
                                ariaLabel="Mögliche Blocker"
                                content={`Mögliche Blocker: Ø-Temperatur ≤ 10 °C; Ø-Luftfeuchte ≥ 80 %; Regen (24h) ≥ 3 mm; Regenrate > 0 mm/h; Entzug < Startschwelle (≈ ${(response?.triggerMm ?? 0).toFixed(0)} mm)`}
                                iconSize={18}
                              />
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {(() => {
                                const chips: ReactNode[] = [];
                                const tempActive = response.outTemp <= 10;
                                const humActive = response.humidity >= 80;
                                const rain24Active = response.rainToday >= 3;
                                const rateActive = response.rainRate > 0;
                                const drynessActive = typeof response.depletionMm === 'number' && typeof response.triggerMm === 'number' && response.depletionMm < response.triggerMm;
                                if (tempActive) chips.push(
                                  <Chip key="b-temp" color="error" variant="filled" icon={<ThermostatAutoIcon />} label="Ø-Temperatur ≤ 10 °C" />
                                );
                                if (humActive) chips.push(
                                  <Chip key="b-hum" color="error" variant="filled" icon={<OpacityOutlinedIcon />} label="Ø-Luftfeuchte ≥ 80 %" />
                                );
                                if (rain24Active) chips.push(
                                  <Chip key="b-r24" color="error" variant="filled" icon={<WaterDropIcon />} label="Regen (24h) ≥ 3 mm" />
                                );
                                if (rateActive) chips.push(
                                  <Chip key="b-rate" color="error" variant="filled" icon={<SpeedIcon />} label="Regenrate > 0" />
                                );
                                if (drynessActive) chips.push(
                                  <Chip key="b-dry" color="error" variant="filled" icon={<Inventory2OutlinedIcon />} label={`Entzug < Startschwelle`} />
                                );
                                return chips.length ? chips : [
                                  <Chip key="b-none" color="success" variant="outlined" label="Keine Blocker aktiv" />
                                ];
                              })()}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
                <Grid size={12}>
                  <Button
                    variant='outlined'
                    onClick={async () => {
                      const newVal = !skipDecision;
                      try {
                        await fetch(`${apiUrl}/decisionCheck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skip: newVal }) });
                        setSkipDecision(newVal);
                        showSnackbar(newVal ? 'Entscheidungsprüfung deaktiviert' : 'Entscheidungsprüfung aktiviert');
                        queryClient.invalidateQueries({ queryKey: ['decisionCheck'] });
                      } catch (err) {
                        console.error(err);
                        showSnackbar('Fehler');
                      }
                    }}
                    fullWidth
                    color='error'
                  >
                    Entscheidungsprüfung deaktivieren
                  </Button>
                </Grid>
              </Grid>
            )}
            </CardContent>
          </Card>
        </Grid>

        {/* Use the SchedulerCard component */}
        <Grid size={12} sx={{ mt: 2 }}>
          <SchedulerCard
            taskToCopy={copiedTask}
          />
        </Grid>

        <Grid size={12} sx={{ mt: 2 }}>
          <Card variant='outlined' sx={{ borderRadius: 2, position: 'relative' }}>
            <CardHeader
              title={'Eingestellte Zeitpläne'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            {tasksLoading && (
              <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
            )}
            <CardContent>
              <>
                {scheduledTasks.length === 0 && !tasksLoading && (
                  <Typography variant="body1">Keine eingestellten Zeitpläne</Typography>
                )}

                {tasksZoneTopics.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <ZoneSelector
                      value={selectedTasksTopic || tasksZoneTopics[0]}
                      onChange={(topic) => setSelectedTasksTopic(topic)}
                      labels={tasksZones}
                      values={tasksZoneTopics}
                      ariaLabel="Zone"
                    />
                  </Box>
                )}

                {(() => {
                  if (!selectedTasksTopic) return tasksLoading ? <Box sx={{ minHeight: 120 }} /> : null;
                  const idx = bewaesserungsTopicsSet.indexOf(selectedTasksTopic);
                  const selectedZoneName = idx >= 0 ? switchDescriptions[idx] : tasksZones[0];
                  const tasks = orderedTasks[selectedZoneName] || [];
                  const redisKey = selectedTasksTopic;
                  return (
                    <ScheduledTaskCard
                      key={`${selectedZoneName}-${redisKey}`}
                      zoneName={selectedZoneName}
                      tasks={tasks}
                      onDelete={handleDeleteTask}
                      redisKey={redisKey}
                      onCopyTask={setCopiedTask}
                    />
                  );
                })()}
              </>
            </CardContent>
          </Card>
        </Grid>
      </Box>
    </Layout >
  );
};

export default BewaesserungPage;
