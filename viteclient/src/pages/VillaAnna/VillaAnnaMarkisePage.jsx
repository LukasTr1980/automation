import { useContext, useEffect, useState, useCallback } from 'react';
import { Typography, Grid, Card, CardHeader, CardContent, Box } from '@mui/material';
import OnPressSwitchComponent from '../../components/OnPressSwitchComponent';
import SchedulerCard from '../../components/SchedulerCard';
import ScheduledTaskCard from '../../components/ScheduledTaskCard'; // Assuming you use this, as in the other page
import { useCookies } from 'react-cookie';
import axios from 'axios';
import Layout from '../../Layout'
import { SocketContext } from '../../components/socketio/SocketContext';
import SwitchComponent from '../../components/switchComponent';

const MarkisePage = () => {
    const [markiseStatus, setMarkiseStatus] = useState({});
    const { socket, connected } = useContext(SocketContext);
    const [switchesLoaded, setSwitchesLoaded] = useState(false);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const isLoading = !(switchesLoaded && tasksLoaded);
    const [markiseState, setMarkiseState] = useState(null);
    const [scheduledTasks, setScheduledTasks] = useState([]);
    const [cookies] = useCookies(['session']);
    const [reloadTasks, setReloadTasks] = useState(false);
    const customMarkiseLabels = { '1': "Ausfahren", '2': "Einfahren" };
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const sessionId = cookies.session;
        const url = sessionId ? `${apiUrl}/mqtt?session=${sessionId}` : `${apiUrl}/mqtt`;
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

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
    }, [cookies, apiUrl]);

    useEffect(() => {
        axios.get(`${apiUrl}/scheduledTasks`)
            .then(response => {
                const tasksArray = Object.entries(response.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
                const markiseTasks = tasksArray.filter(task => task.topic === 'markise/switch/haupt');
                setScheduledTasks(markiseTasks);
                setTasksLoaded(true);
            })
            .catch(error => console.error('Error:', error));
    }, [reloadTasks, apiUrl]);

    const handleSend = (value) => {
        const topic = 'markise/switch/haupt';

        const data = {
            topic,
            state: value,
        };

        axios.post(`${apiUrl}/simpleapi`, data)
            .then(() => {
            })
            .catch((error) => {
                console.error('Error: ', error);
            });
    };

    const sortedTasks = Array.isArray(scheduledTasks) ? [...scheduledTasks].sort((a, b) => a.state - b.state) : [];

    const handleDeleteTask = (taskId) => {
        setScheduledTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        setReloadTasks(prevState => !prevState);  // Toggle to force re-fetch
    };

    const fetchCurrentMarkiseStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/markiseStatus/currentMarkiseStatus`);
            setMarkiseStatus(response.data);
        } catch (error) {
            console.error('Error fetching current markise status', error);
        }
    }, [apiUrl]);  // dependencies for useCallback

    useEffect(() => {
        // Fetch on mount
        fetchCurrentMarkiseStatus();
    }, [fetchCurrentMarkiseStatus]);

    useEffect(() => {
        if (socket && connected) {  // Check connected status
            socket.on("redis-markise-update", () => {
                fetchCurrentMarkiseStatus();
            });
        }
        return () => {
            if (socket) {
                socket.off("redis-markiseupdate-update");  // Clean up event listener
            }
        };
    }, [socket, fetchCurrentMarkiseStatus, connected]);  // Include connected in dependencies    

    return (
        <Layout title='Villa Anna Markise' loading={isLoading}>
            <>
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
                    <Card>
                        <CardHeader title="Wetter Block" />
                        <CardContent>
                            <Box display="flex" justifyContent="center" alignItems="center" gap={3}>
                                <SwitchComponent
                                    checked={markiseStatus['weather:raining'] === 'closing'}
                                    label="Regen block"
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                />
                                <SwitchComponent
                                    checked={markiseStatus['weather:windy'] === 'closing'}
                                    label="Wind block"
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                />
                                <SwitchComponent
                                    checked={markiseStatus.throttling_active === 'true'}
                                    label="Drosselung"
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                />
                            </Box>
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
                            <ScheduledTaskCard zoneName="Markise" tasks={sortedTasks} customLabels={customMarkiseLabels} onDelete={handleDeleteTask} redisKey="markise/switch/haupt" />
                        </CardContent>
                    </Card>
                </Grid>
            </>
        </Layout>
    );
};

export default MarkisePage;
