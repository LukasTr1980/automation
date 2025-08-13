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
import { useTranslation } from 'react-i18next';
import DialogFullScreen from '../../components/DialogFullScreen';

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
  const [response, setResponse] = useState("");
  const [formattedEvaluation, setFormattedEvaluation] = useState("");
  const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
  const { showSnackbar } = useSnackbar();
  const [isAiResponseDialogOpen, setIsAiResponseDialogOpen] = useState(false);
  const { t } = useTranslation();
  const title = `Villa Anna ${t('irrigation')}`;

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
        const translatedMessage = t(backendMessageKey);
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

  const handleOpenDialog = () => {
    setIsAiResponseDialogOpen(true);
  }

  const handleCloseDialog = () => {
    setIsAiResponseDialogOpen(false);
  }

  return (
    <Layout title={title}>
      <Grid size={12} paddingTop={1} paddingBottom={1}>
        <Card variant='outlined'>
          <CardHeader title={t('switches')} />
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
          <CardHeader title={t('aiDecision')} />
          <CardContent>
            {skipAi ? (
              <Grid container spacing={2} justifyContent="space-between">
                <Grid size={12}>
                  <Typography>{t('aiVerificationDisabled')}</Typography>
                </Grid>
                <Grid size={12}>
                  <Button
                    variant='outlined'
                    onClick={async () => {
                      const newVal = false;
                      try {
                        await axios.post(`${apiUrl}/skipAi`, { skip: newVal });
                        setSkipAi(newVal);
                        showSnackbar(t('aiVerificationEnabled'));
                      } catch (err) {
                        console.error(err);
                        showSnackbar(t('error'));
                      }
                    }}
                    fullWidth
                    color='primary'
                  >
                    {t('enableAiVerification')}
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
                      label='Ai block:'
                      disabled={true}
                      color='warning'
                      id="switch-ai-block"
                      name="switch-ai-block"
                    />
                  </Box>
                </Grid>
                <Grid size={12}>
                  <Button
                    variant='contained'
                    onClick={handleOpenDialog}
                    fullWidth
                    color='info'
                  >
                    {t('aiResponse')}
                  </Button>
                </Grid>
                <Grid size={12}>
                  <Button
                    variant='outlined'
                    onClick={async () => {
                      const newVal = !skipAi;
                      try {
                        await axios.post(`${apiUrl}/skipAi`, { skip: newVal });
                        setSkipAi(newVal);
                        showSnackbar(newVal ? t('aiVerificationDisabled') : t('aiVerificationEnabled'));
                      } catch (err) {
                        console.error(err);
                        showSnackbar(t('error'));
                      }
                    }}
                    fullWidth
                    color='error'
                  >
                    {t('disableAiVerification')}
                  </Button>
                </Grid>
                <DialogFullScreen
                  title={t('aiResponse')}
                  open={isAiResponseDialogOpen}
                  onClose={handleCloseDialog}
                  showButton={false}
                >
                  {/* 1. Zusammenfassung */}
                  <Typography component="p" sx={{ marginBottom: 3 }}>
                    {response}
                  </Typography>

                  {/* 2. Auswertung */}
                  <Typography variant="h6" gutterBottom>
                    {t('testPoints')}
                  </Typography>
                  <List dense>
                    {formattedEvaluation.split('\n').map((line, idx) => {
                      // Text ohne führendes oder trailinges ✓/✗
                      const text = line.replace(/^[✓✗]\s*|[✓✗]\s*$/g, '');
                      // Nur dann Icon rendern, wenn wirklich ✓ oder ✗ in der Zeile
                      const hasTick = /[✓✗]/.test(line);
                      return (
                        <ListItem key={idx}>
                          {hasTick && (
                            <ListItemIcon>
                              <Typography component="span">
                                {line.includes('✓') ? '✅' : '❌'}
                              </Typography>
                            </ListItemIcon>
                          )}
                          <ListItemText primary={text} />
                        </ListItem>
                      );
                    })}
                  </List>

                  {/* 3. Schließen-Button */}
                  <Box textAlign="right" mt={2}>
                    <Button onClick={handleCloseDialog}>{t('close')}</Button>
                  </Box>
                </DialogFullScreen>
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
          <CardHeader title={t("scheduledPlans")} />
          <CardContent>
            {tasksLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {scheduledTasks.length === 0 && <Typography variant="body1">{t('noScheduledPlans')}</Typography>}

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
