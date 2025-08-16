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
import ThermostatAutoIcon from '@mui/icons-material/ThermostatAuto';
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SpeedIcon from '@mui/icons-material/Speed';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import WaterIcon from '@mui/icons-material/Water';
import WavesIcon from '@mui/icons-material/Waves';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Layout from '../../Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import useSnackbar from '../../utils/useSnackbar';
import { GroupedTasks, ScheduledTask, APIResponse } from '../../types/types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SkeletonLoader from '../../components/skeleton';
import { messages } from '../../utils/messages';
// Dialog removed: details shown inline

const BewaesserungPage = () => {
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [skipDecision, setSkipDecision] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [switchesLoading, setSwitchesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [switches, setSwitches] = useState([false, false, false, false, false]);
  const [, setirrigationNeededSwitch] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [orderedTasks, setOrderedTasks] = useState<GroupedTasks>({});
  const [reloadTasks, setReloadTasks] = useState(false);
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
  useEffect(() => {
    axios.get(`${apiUrl}/decisionCheck`)
      .then(resp => setSkipDecision(!!resp.data.skip))
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    axios.get<APIResponse>(`${apiUrl}/scheduledTasks`)
      .then(response => {
        const tasksArray = Object.entries(response.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
        const bewaesserungTasks = tasksArray.filter(task => task.topic.startsWith('bewaesserung'));
        setScheduledTasks(bewaesserungTasks as ScheduledTask[]);

        const groupedTasksLocal = bewaesserungTasks.reduce<GroupedTasks>((groups, task) => {
          const topicIndex = bewaesserungsTopicsSet.indexOf(task.topic);
          const zoneName = switchDescriptions[topicIndex];

          if (!groups[zoneName]) {
            groups[zoneName] = [];
          }

          groups[zoneName].push(task as ScheduledTask);
          groups[zoneName].sort((a, b) => Number(b.state) - Number(a.state));

          return groups;
        }, {});

        const orderedTasksLocal = zoneOrder.reduce<GroupedTasks>((ordered, zone) => {
          if (groupedTasksLocal[zone]) {
            ordered[zone] = groupedTasksLocal[zone];
          }
          return ordered;
        }, {});

        // Set the orderedTasks to the state
        setOrderedTasks(orderedTasksLocal);
        setTasksLoading(false);
      })
      .catch(error => console.error('Error:', error));
  }, [reloadTasks, apiUrl]);

  const handleToggle = (index: number) => {
    const newSwitchState = switches.map((val, i) => (i === index ? !val : val));
    setSwitches(newSwitchState);

    axios.post(`${apiUrl}/simpleapi`, {
      topic: bewaesserungsTopicsSet[index],
      state: newSwitchState[index],
    })
      .then(response => {
          const backendMessageKey = response.data;
          const translatedMessage = messages[backendMessageKey] || backendMessageKey;
          showSnackbar(translatedMessage);
      })
      .catch(error => console.error('Error:', error));
  };

  const handleDeleteTask = (taskId: string) => {
    setScheduledTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setReloadTasks(prevState => !prevState);  // Toggle to force re-fetch
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Dialog handlers removed

  return (
    <Layout>
      {/* Page container aligned with HomePage */}
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
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
                          await axios.post(`${apiUrl}/decisionCheck`, { skip: newVal });
                          setSkipDecision(newVal);
                          // Show loading until the next SSE decision arrives
                          setDecisionLoading(true);
                          setResponse(null);
                          showSnackbar('Entscheidungsprüfung aktiviert');
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
                              <ListItemText
                                primary={`Ø-Temperatur (7 Tage)`}
                                secondary={`${response.outTemp.toFixed(1)} °C`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><OpacityOutlinedIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Ø-Luftfeuchte (7 Tage)`}
                                secondary={`${response.humidity.toFixed(0)} %`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WaterDropIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Regen (24h)`}
                                secondary={`${response.rainToday.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><SpeedIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Regenrate (aktuell)`}
                                secondary={`${response.rainRate.toFixed(1)} mm/h`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><QueryStatsIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Prognose (morgen, gewichtet)`}
                                secondary={`${response.rainNextDay.toFixed(1)} mm × ${response.rainProbNextDay.toFixed(0)} % Wahrscheinlichkeit = ${response.effectiveForecast.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><CalendarViewWeekIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Regen Summe (7 Tage)`}
                                secondary={`${response.rainSum.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WaterIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Bewässerung Summe (7 Tage)`}
                                secondary={`${response.irrigationDepthMm.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><WavesIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Verdunstung Summe (7 Tage)`}
                                secondary={`${response.et0_week.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: 0, mr: 1 }}><TrendingDownIcon color="action" /></ListItemIcon>
                              <ListItemText
                                primary={`Wasserdefizit`}
                                secondary={`${response.deficitNow.toFixed(1)} mm`}
                                primaryTypographyProps={{ align: 'center' }}
                                secondaryTypographyProps={{ align: 'center' }}
                              />
                            </ListItem>
                          </List>
                          {/* Blockers section */}
                          <Box mt={2}>
                            <Typography variant="subtitle1" gutterBottom align="center">Blocker Aktiv</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {(() => {
                                const chips: ReactNode[] = [];
                                const tempActive = response.outTemp <= 10;
                                const humActive = response.humidity >= 80;
                                const rain24Active = response.rainToday >= 3;
                                const rateActive = response.rainRate > 0;
                                const deficitActive = response.deficitNow < 5;
                                if (tempActive) chips.push(
                                  <Tooltip title={`Ø-Temperatur 7 Tage: ${response.outTemp.toFixed(1)} °C`} key="b-temp">
                                    <Chip color="error" variant="filled" icon={<ThermostatAutoIcon />} label="Ø-Temperatur ≤ 10 °C" />
                                  </Tooltip>
                                );
                                if (humActive) chips.push(
                                  <Tooltip title={`Ø-Luftfeuchte 7 Tage: ${response.humidity.toFixed(0)} %`} key="b-hum">
                                    <Chip color="error" variant="filled" icon={<OpacityOutlinedIcon />} label="Ø-Luftfeuchte ≥ 80 %" />
                                  </Tooltip>
                                );
                                if (rain24Active) chips.push(
                                  <Tooltip title={`Regen (24h): ${response.rainToday.toFixed(1)} mm`} key="b-r24">
                                    <Chip color="error" variant="filled" icon={<WaterDropIcon />} label="Regen (24h) ≥ 3 mm" />
                                  </Tooltip>
                                );
                                if (rateActive) chips.push(
                                  <Tooltip title={`Regenrate: ${response.rainRate.toFixed(1)} mm/h`} key="b-rate">
                                    <Chip color="error" variant="filled" icon={<SpeedIcon />} label="Regenrate > 0" />
                                  </Tooltip>
                                );
                                if (deficitActive) chips.push(
                                  <Tooltip title={`Wasserdefizit: ${response.deficitNow.toFixed(1)} mm`} key="b-def">
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
                        await axios.post(`${apiUrl}/decisionCheck`, { skip: newVal });
                        setSkipDecision(newVal);
                        showSnackbar(newVal ? 'Entscheidungsprüfung deaktiviert' : 'Entscheidungsprüfung aktiviert');
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
            setReloadTasks={setReloadTasks}
            scheduledTasks={scheduledTasks}
            setScheduledTasks={setScheduledTasks}
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

                  <Box sx={{ display: 'flex', justifyContent: 'center', maxWidth: { xs: 310, sm: '100%' } }}>
                    <Tabs value={activeTab}
                      onChange={handleTabChange}
                      variant='scrollable'
                      aria-label="Zone tabs"
                      scrollButtons
                      allowScrollButtonsMobile
                    >
                      {Object.keys(orderedTasks).map((zoneName) => (
                        <Tab label={zoneName} key={zoneName} />
                      ))}
                    </Tabs>
                  </Box>

                  {Object.entries(orderedTasks).map(([zoneName, tasks]) => {
                    if (zoneName === Object.keys(orderedTasks)[activeTab]) {
                      const topicIndex = switchDescriptions.findIndex(desc => desc === zoneName);
                      const redisKey = bewaesserungsTopicsSet[topicIndex];

                      return (
                        <ScheduledTaskCard
                          key={`${zoneName}-${topicIndex}`}
                          zoneName={zoneName}
                          tasks={tasks}
                          onDelete={handleDeleteTask}
                          redisKey={redisKey}
                          onCopyTask={setCopiedTask}
                        />
                      );
                    }
                    return null;
                  })}
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
