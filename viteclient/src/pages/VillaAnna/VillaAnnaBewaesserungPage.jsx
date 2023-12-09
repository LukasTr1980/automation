import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import SwitchComponent from '../../components/switchComponent';
import { switchDescriptions, bewaesserungsTopics, zoneOrder, bewaesserungsTopicsSet } from '../../components/constants';
import ScheduledTaskCard from '../../components/ScheduledTaskCard';
import SchedulerCard from '../../components/SchedulerCard'; // Import the SchedulerCard component
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextareaAutosize,
  TextField
} from '@mui/material';
import Layout from '../../Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { SnackbarContext } from '../../components/snackbar/SnackbarContext';

const BewaesserungPage = () => {
  const [aiLoading, setAiLoading] = useState(true);
  const [switchesLoading, setSwitchesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [switches, setSwitches] = useState([false, false, false, false, false]);
  const [irrigationNeededSwitch, setirrigationNeededSwitch] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [cookies] = useCookies(['session']);
  const [orderedTasks, setOrderedTasks] = useState({});
  const [reloadTasks, setReloadTasks] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [response, setResponse] = useState("");
  const [formattedEvaluation, setFormattedEvaluation] = useState("");
  const { showSnackbar } = useContext(SnackbarContext);

  useEffect(() => {
    const sessionId = cookies.session;
    const url = sessionId ? `${apiUrl}/mqtt?session=${sessionId}` : `${apiUrl}/mqtt`;
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
  }, [cookies, apiUrl]);

  useEffect(() => {
    axios.get(`${apiUrl}/scheduledTasks`)
      .then(response => {
        const tasksArray = Object.entries(response.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
        const bewaesserungTasks = tasksArray.filter(task => task.topic.startsWith('bewaesserung'));
        setScheduledTasks(bewaesserungTasks);

        const groupedTasksLocal = bewaesserungTasks.reduce((groups, task) => {
          const topicIndex = bewaesserungsTopicsSet.indexOf(task.topic);
          const zoneName = switchDescriptions[topicIndex];

          if (!groups[zoneName]) {
            groups[zoneName] = [];
          }

          groups[zoneName].push(task);
          groups[zoneName].sort((a, b) => b.state - a.state);

          return groups;
        }, {});

        const orderedTasksLocal = zoneOrder.reduce((ordered, zone) => {
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

  const handleToggle = (index) => {
    const newSwitchState = switches.map((val, i) => (i === index ? !val : val));
    setSwitches(newSwitchState);

    axios.post(`${apiUrl}/simpleapi`, {
      topic: bewaesserungsTopicsSet[index],
      state: newSwitchState[index],
    })
      .then(response => {
        showSnackbar(response.data);
      })
      .catch(error => console.error('Error:', error));
  };

  const handleDeleteTask = (taskId) => {
    setScheduledTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setReloadTasks(prevState => !prevState);  // Toggle to force re-fetch
  };

  return (
    <Layout title='Villa Anna Bewässerung'>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Schalter" />
          <CardContent>
            {switchesLoading ? (
              <LoadingSpinner />
            ) : (
              <Grid container spacing={2} justify="space-between">
                {switches.map((val, i) => (
                  <Grid item key={i}>
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

      <Grid item xs={12}>
        <Card>
          <CardHeader title="AI Entscheidung" />
          <CardContent>
            {aiLoading ? (
              <LoadingSpinner />
            ) : (
              <Grid container spacing={2} justify="space-between">
                <Grid item xs={12}>
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
                <Grid item xs={12}>
                  <TextField
                    id="textAiResponse"
                    name="textAiResponse"
                    label="AI Antwort"
                    variant="outlined"
                    fullWidth
                    multiline
                    InputProps={{
                      inputComponent: TextareaAutosize,
                      inputProps: {
                        minRows: 3,
                        value: `${response}` +
                          `${formattedEvaluation ? `\n\n${formattedEvaluation}` : ''}`,
                        spellCheck: false
                      }
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Use the SchedulerCard component */}
      <Grid item xs={12}>
        <SchedulerCard setReloadTasks={setReloadTasks} scheduledTasks={scheduledTasks} setScheduledTasks={setScheduledTasks} />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title="Eingestellte Zeipläne" />
          <CardContent>
            {tasksLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {scheduledTasks.length === 0 && <Typography variant="body1">Keine eingestellten Zeitpläne.</Typography>}
                {Object.entries(orderedTasks).map(([zoneName, tasks], index) => {
                  return <ScheduledTaskCard key={`${zoneName}-${index}`} zoneName={zoneName} tasks={tasks} onDelete={handleDeleteTask} redisKey={bewaesserungsTopicsSet[index]} />
                })}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Layout>
  );
};

export default BewaesserungPage;
