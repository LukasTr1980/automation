import { useState, useEffect } from 'react';
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
  Button
} from '@mui/material';
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
  const [aiLoading, setAiLoading] = useState(true);
  const [skipAi, setSkipAi] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [switchesLoading, setSwitchesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [switches, setSwitches] = useState([false, false, false, false, false]);
  const [irrigationNeededSwitch, setirrigationNeededSwitch] = useState(false);
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
  const [formattedEvaluation, setFormattedEvaluation] = useState("");
  const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
  const { showSnackbar } = useSnackbar();
  // Dialog state removed

  useEffect(() => {
    const params = new URLSearchParams();
    // If skipAi is true, instruct backend not to run the AI check for the
    // initial irrigation evaluation pushed via the SSE endpoint.
    if (skipAi) params.set('checkIrrigation', 'false');
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
        setFormattedEvaluation(data.formattedEvaluation);
        setAiLoading(false);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [apiUrl, skipAi]);

  // Load initial skipAi state from backend
  useEffect(() => {
    axios.get(`${apiUrl}/skipAi`)
      .then(resp => setSkipAi(!!resp.data.skip))
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
      <Grid size={12} paddingTop={1} paddingBottom={1}>
        <Card variant='outlined'>
          <CardHeader title={'Schalter'} />
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

      <Grid size={12} paddingBottom={1}>
        <Card variant='outlined'>
          <CardHeader title={'Smarte Entscheidung'} />
          <CardContent>
            {skipAi ? (
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
                        await axios.post(`${apiUrl}/skipAi`, { skip: newVal });
                        setSkipAi(newVal);
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
            ) : aiLoading ? (
              <SkeletonLoader />
            ) : (
              <Grid container spacing={2} justifyContent="space-between">
                <Grid size={12}>
                  <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
                    <SwitchComponent
                      checked={!irrigationNeededSwitch}
                      label='Blocker:'
                      disabled={true}
                      color='warning'
                      id="switch-ai-block"
                      name="switch-ai-block"
                    />
                  </Box>
                </Grid>
                {response && (
                  <Grid size={12}>
                    <Box mt={1}>
                      <Typography variant="h6" gutterBottom>
                        Prüfpunkte
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary={`ØTemp 7 d: ${response.outTemp.toFixed(1)} °C`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`ØRH 7 d: ${response.humidity.toFixed(0)} %`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`Regen heute: ${response.rainToday.toFixed(1)} mm`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`Regenrate: ${response.rainRate.toFixed(1)} mm/h`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`Prognose morgen: ${response.rainNextDay.toFixed(1)} mm × ${response.rainProbNextDay.toFixed(0)} % = ${response.effectiveForecast.toFixed(1)} mm`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`7-T-Regen: ${response.rainSum.toFixed(1)} mm`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`7-T-Bewässerung: ${response.irrigationDepthMm.toFixed(1)} mm`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`ET₀ 7 T: ${response.et0_week.toFixed(1)} mm`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary={`ET₀-Defizit: ${response.deficitNow.toFixed(1)} mm`} />
                        </ListItem>
                      </List>
                      {response.blockers && response.blockers.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="subtitle1">Aktive Blocker</Typography>
                          <List dense>
                            {response.blockers.map((b, idx) => (
                              <ListItem key={idx}><ListItemText primary={b} /></ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}
                <Grid size={12}>
                  <Button
                    variant='outlined'
                    onClick={async () => {
                      const newVal = !skipAi;
                      try {
                        await axios.post(`${apiUrl}/skipAi`, { skip: newVal });
                        setSkipAi(newVal);
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
                {/* Dialog removed */}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Use the SchedulerCard component */}
      <Grid size={12} paddingBottom={1}>
        <SchedulerCard
          setReloadTasks={setReloadTasks}
          scheduledTasks={scheduledTasks}
          setScheduledTasks={setScheduledTasks}
          taskToCopy={copiedTask}
        />
      </Grid>

      <Grid size={12}>
        <Card variant='outlined'>
          <CardHeader title={'Eingestellte Zeitpläne'} />
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
    </Layout >
  );
};

export default BewaesserungPage;
