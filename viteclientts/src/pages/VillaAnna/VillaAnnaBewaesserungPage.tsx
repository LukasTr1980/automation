import { useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import SwitchComponent from '../../components/switchComponent';
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
  Tooltip,
  Divider
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import ThermostatAutoIcon from '@mui/icons-material/ThermostatAuto';
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SpeedIcon from '@mui/icons-material/Speed';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import WaterIcon from '@mui/icons-material/Water';
import WavesIcon from '@mui/icons-material/Waves';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Layout from '../../Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import useSnackbar from '../../utils/useSnackbar';
import { GroupedTasks, ScheduledTask, APIResponse } from '../../types/types';
// Tabs removed in favor of shared ZoneSelector
import SkeletonLoader from '../../components/skeleton';
import { ZoneSelector } from '../../components/index';
import { messages } from '../../utils/messages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// Dialog removed: details shown inline

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
    rainSum: number;
    irrigationDepthMm: number;
    et0_week: number;
    effectiveForecast: number;
    deficitNow: number;
    blockers: string[];
  }

  const [response, setResponse] = useState<DecisionMetrics | null>(null);
  const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
  const { showSnackbar } = useSnackbar();
  // Dialog state removed

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

  useEffect(() => {
    const params = new URLSearchParams();
    // If decision is skipped, instruct backend not to run the decision check for the
    // initial irrigation evaluation pushed via the SSE endpoint.
    if (skipDecision) params.set('checkIrrigation', 'false');
    const url = `${apiUrl}/mqtt?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.latestStates) { // Initial state
        const initialSwitchStates = bewaesserungsTopics.map((topic) => data.latestStates[topic] === 'true');
        setSwitches(initialSwitchStates);
        setSwitchesLoading(false);
      }
      else if (data.type === 'switchState') { // Updates
        const index = bewaesserungsTopics.indexOf(data.topic);
        if (index !== -1) {
          setSwitches(switches => switches.map((val, i) => (i === index ? data.state === 'true' : val)));
        }
      } else if (data.type === 'irrigationNeeded') { // Irrigation needed state updates
        setirrigationNeededSwitch(data.state);
        setResponse(data.response);
        setDecisionLoading(false);
      }
    };

    return () => {
      eventSource.close();
    };
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
              mb: 1,
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            Bewässerung
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', md: '1rem' } }}
          >
            Manuelle Steuerung und Zeitpläne
          </Typography>
        </Box>

        <Grid size={12}>
          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardHeader
              title={'Schalter'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            <CardContent>
              {switchesLoading ? (
                <LoadingSpinner />
              ) : (
                <Grid container spacing={2} justifyContent="space-between">
                  {switches.map((val, i) => (
                    <Grid key={i}>
                      <SwitchComponent
                        checked={val}
                        label={switchDescriptions[i]}
                        handleToggle={() => handleToggle(i)}
                        disabled={toggling[i]}
                        id={`switch-${switchDescriptions[i].toLowerCase().replace(/\s+/g, '-')}-${i}`}
                        name={`switch-${switchDescriptions[i].toLowerCase().replace(/\s+/g, '-')}-${i}`}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12} sx={{ mt: 2 }}>
          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardHeader
              title={'Smarte Entscheidung'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            <CardContent>
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
                      <SkeletonLoader />
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
                                <Tooltip 
                                  title={sevenDayFullRangeLabel ? `Zeitraum: ${sevenDayFullRangeLabel} (lokal)` : ''}
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={10000}
                                  leaveDelay={10000}
                                >
                                  <IconButton size="small" aria-label="Zeitraum anzeigen" sx={{ color: 'text.secondary', p: 0.25 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
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
                                <Tooltip 
                                  title={sevenDayFullRangeLabel ? `Zeitraum: ${sevenDayFullRangeLabel} (lokal)` : ''}
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={10000}
                                  leaveDelay={10000}
                                >
                                  <IconButton size="small" aria-label="Zeitraum anzeigen" sx={{ color: 'text.secondary', p: 0.25 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
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
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><QueryStatsIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Prognose (morgen, gewichtet)`}
                                secondary={`${response.rainNextDay.toFixed(1)} mm × ${response.rainProbNextDay.toFixed(0)} % Wahrscheinlichkeit = ${response.effectiveForecast.toFixed(1)} mm`}
                                slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><CalendarViewWeekIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Regen Summe (7 Tage bis gestern)`}
                                  secondary={`${response.rainSum.toFixed(1)} mm`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                <Tooltip 
                                  title={sevenDayFullRangeLabel ? `Zeitraum: ${sevenDayFullRangeLabel} (lokal)` : ''}
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={10000}
                                  leaveDelay={10000}
                                >
                                  <IconButton size="small" aria-label="Zeitraum anzeigen" sx={{ color: 'text.secondary', p: 0.25 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WaterIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Bewässerung Summe (7 Tage bis gestern)`}
                                  secondary={`${response.irrigationDepthMm.toFixed(1)} mm`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                <Tooltip 
                                  title={sevenDayFullRangeLabel ? `Zeitraum: ${sevenDayFullRangeLabel} (lokal)` : ''}
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={10000}
                                  leaveDelay={10000}
                                >
                                  <IconButton size="small" aria-label="Zeitraum anzeigen" sx={{ color: 'text.secondary', p: 0.25 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WavesIcon color="action" /></ListItemIcon>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', justifyContent: 'center' }}>
                                <ListItemText
                                  primary={`Verdunstung Summe (7 Tage bis gestern)`}
                                  secondary={`${response.et0_week.toFixed(1)} mm`}
                                  slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                                />
                                <Tooltip 
                                  title={sevenDayFullRangeLabel ? `Zeitraum: ${sevenDayFullRangeLabel} (lokal)` : ''}
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={10000}
                                  leaveDelay={10000}
                                >
                                  <IconButton size="small" aria-label="Zeitraum anzeigen" sx={{ color: 'text.secondary', p: 0.25 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><TrendingDownIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Wasserdefizit`}
                                secondary={`${response.deficitNow.toFixed(1)} mm`}
                                slotProps={{ primary: { align: 'center' }, secondary: { align: 'center' } }}
                              />
                            </ListItem>
                          </List>
                          {/* Blockers section */}
                          <Box mt={2}>
                            <Typography variant="subtitle1" gutterBottom align="center" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              Blocker Aktiv
                              <Tooltip 
                                title={'Mögliche Blocker: Ø-Temperatur ≤ 10 °C; Ø-Luftfeuchte ≥ 80 %; Regen (24h) ≥ 3 mm; Regenrate > 0 mm/h; Defizit < 5 mm'}
                                arrow
                                placement="top"
                                enterTouchDelay={0}
                                leaveTouchDelay={10000}
                                leaveDelay={10000}
                              >
                                <IconButton size="small" aria-label="Mögliche Blocker" sx={{ color: 'text.secondary', p: 0.25 }}>
                                  <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {(() => {
                                const chips: ReactNode[] = [];
                                const tempActive = response.outTemp <= 10;
                                const humActive = response.humidity >= 80;
                                const rain24Active = response.rainToday >= 3;
                                const rateActive = response.rainRate > 0;
                                const deficitActive = response.deficitNow < 5;
                                if (tempActive) chips.push(
                                  <Tooltip title={`Ø-Temperatur 7 Tage: ${response.outTemp.toFixed(1)} °C`} key="b-temp" leaveDelay={10000} leaveTouchDelay={10000}>
                                    <Chip color="error" variant="filled" icon={<ThermostatAutoIcon />} label="Ø-Temperatur ≤ 10 °C" />
                                  </Tooltip>
                                );
                                if (humActive) chips.push(
                                  <Tooltip title={`Ø-Luftfeuchte 7 Tage: ${response.humidity.toFixed(0)} %`} key="b-hum" leaveDelay={10000} leaveTouchDelay={10000}>
                                    <Chip color="error" variant="filled" icon={<OpacityOutlinedIcon />} label="Ø-Luftfeuchte ≥ 80 %" />
                                  </Tooltip>
                                );
                                if (rain24Active) chips.push(
                                  <Tooltip title={`Regen (24h): ${response.rainToday.toFixed(1)} mm`} key="b-r24" leaveDelay={10000} leaveTouchDelay={10000}>
                                    <Chip color="error" variant="filled" icon={<WaterDropIcon />} label="Regen (24h) ≥ 3 mm" />
                                  </Tooltip>
                                );
                                if (rateActive) chips.push(
                                  <Tooltip title={`Regenrate: ${response.rainRate.toFixed(1)} mm/h`} key="b-rate" leaveDelay={10000} leaveTouchDelay={10000}>
                                    <Chip color="error" variant="filled" icon={<SpeedIcon />} label="Regenrate > 0" />
                                  </Tooltip>
                                );
                                if (deficitActive) chips.push(
                                  <Tooltip title={`Wasserdefizit: ${response.deficitNow.toFixed(1)} mm`} key="b-def" leaveDelay={10000} leaveTouchDelay={10000}>
                                    <Chip color="error" variant="filled" icon={<TrendingDownIcon />} label="Defizit < 5 mm" />
                                  </Tooltip>
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
          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardHeader
              title={'Eingestellte Zeitpläne'}
              slotProps={{ title: { sx: { fontWeight: 600 } } }}
            />
            <CardContent>
              {tasksLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  {scheduledTasks.length === 0 && <Typography variant="body1">Keine eingestellten Zeitpläne</Typography>}

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
                    if (!selectedTasksTopic) return null;
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
              )}
            </CardContent>
          </Card>
        </Grid>
      </Box>
    </Layout >
  );
};

export default BewaesserungPage;
