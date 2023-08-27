import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Grid, Card, CardHeader, CardContent, CircularProgress } from '@mui/material';
import BackButton from './components/BackButton';
import OnPressSwitchComponent from './components/OnPressSwitchComponent';
import SchedulerCard from './components/SchedulerCard';
import ScheduledTaskCard from './components/ScheduledTaskCard'; // Assuming you use this, as in the other page
import { useCookies } from 'react-cookie';
import axios from 'axios';

const MarkisePage = () => {
    const [switchesLoaded, setSwitchesLoaded] = useState(false);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const isLoading = !(switchesLoaded && tasksLoaded);
    const [markiseState, setMarkiseState] = useState(null);
    const [scheduledTasks, setScheduledTasks] = useState([]);
    const [cookies] = useCookies(['session']);
    const [reloadTasks, setReloadTasks] = useState(false);
    const customMarkiseLabels = { '1': "Ausfahren", '2': "Einfahren" };

    useEffect(() => {
        const sessionId = cookies.session;
        const url = sessionId ? `https://automation.charts.cx/mqtt?session=${sessionId}` : 'https://automation.charts.cx/mqtt';
        const eventSource = new EventSource(url);
    
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data);
    
            if (data.type === 'switchState') {
                // Handle the individual switch update
                if (data.topic && data.topic === 'markise/switch/haupt') {
                    setMarkiseState(data.state);
                    setSwitchesLoaded(true);
                }
                
                // Handle the initial state for all switches
                else if (data.latestStates && data.latestStates['markise/switch/haupt'] !== undefined) {
                    setMarkiseState(data.latestStates['markise/switch/haupt']);
                    setSwitchesLoaded(true);
                }
            }
        };
    
        return () => {
            eventSource.close();
        };
    }, [cookies]);    

    useEffect(() => {
        axios.get('https://automation.charts.cx/scheduledTasks')
            .then(response => {
                const tasksArray = Object.entries(response.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
                const markiseTasks = tasksArray.filter(task => task.topic === 'markise/switch/haupt');
                setScheduledTasks(markiseTasks);
                setTasksLoaded(true);
            })
            .catch(error => console.error('Error:', error));
    }, [reloadTasks]);

    const handleSend = (value) => {
        const topic = 'markise/switch/haupt';
        const apiUrl = 'https://automation.charts.cx/simpleapi';

        const data = {
            topic,
            state: value,
        };

        axios.post(apiUrl, data)
            .then((response) => {
                console.log('Success: ', response.data);
            })
            .catch((error) => {
                console.error('Error: ', error);
            });
    };

    const sortedTasks = Array.isArray(scheduledTasks) ? [...scheduledTasks].sort((a, b) => a.state - b.state) : [];

    return (
        <Container>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularProgress size={50} />
                </Box>

            ) : (
                <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto' }}>
                    <Grid container spacing={3} justify="center" alignItems="center">
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Box sx={{ alignSelf: 'flex-start' }}>
                                    <BackButton />
                                </Box>
                                <Typography variant="h3" align="center">Markise</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Card>
                                <CardHeader title="Markise Steuern" />
                                <CardContent>
                                    <Grid container spacing={2} justify="center">
                                        <OnPressSwitchComponent markiseState={markiseState} onSend={handleSend} />
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12}>
                            <SchedulerCard
                                initialTopic="markise/switch/haupt"
                                mqttTopics={["markise/switch/haupt"]}
                                topicDescriptions={["Markise"]}
                                scheduledTasks={scheduledTasks}
                                setScheduledTasks={setScheduledTasks}
                                setReloadTasks={setReloadTasks}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Card>
                                <CardHeader title="Eingestellte Zeitpläne" />
                                <CardContent>
                                    {scheduledTasks.length === 0 && <Typography variant="body1">Keine eingestellten Zeitpläne.</Typography>}
                                    <ScheduledTaskCard zoneName="Markise" tasks={sortedTasks} customLabels={customMarkiseLabels} />
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}
        </Container>
    );
};

export default MarkisePage;
