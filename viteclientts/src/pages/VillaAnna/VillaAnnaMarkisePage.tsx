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
import useSnackbar from '../../utils/useSnackbar';
import { MarkiseStatus, ScheduledTask, APIResponse } from '../../types/types';

const MarkisePage = () => {
    const [markiseStatus, setMarkiseStatus] = useState<MarkiseStatus>({});
    const { socket, connected } = useContext(SocketContext);
    const [switchesLoaded, setSwitchesLoaded] = useState(false);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const isLoading = !(switchesLoaded && tasksLoaded);
    const [markiseState, setMarkiseState] = useState(null);
    const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
    const [cookies] = useCookies(['session']);
    const [reloadTasks, setReloadTasks] = useState(false);
    const customMarkiseLabels = { '1': "Ausfahren", '2': "Einfahren" };
    const apiUrl = import.meta.env.VITE_API_URL;
    const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
    const { showSnackbar } = useSnackbar();

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
        axios.get<APIResponse>(`${apiUrl}/scheduledTasks`)
            .then(response => {
                const tasksArray = Object.entries(response.data).flatMap(([key, tasks]) => tasks.map(task => ({ topic: key, ...task })));
                const markiseTasks = tasksArray.filter(task => task.topic === 'markise/switch/haupt/set');
                setScheduledTasks(markiseTasks as ScheduledTask[]);
                setTasksLoaded(true);
            })
            .catch(error => console.error('Error:', error));
    }, [reloadTasks, apiUrl]);

    const handleSend = (value: number) => {
        const topic = 'markise/switch/haupt/set';

        const data = {
            topic,
            state: value,
        };

        axios.post(`${apiUrl}/simpleapi`, data)
            .then(response => {
                showSnackbar(response.data);
            })
            .catch((error) => {
                console.error('Error: ', error);
            });
    };

    const sortedTasks = Array.isArray(scheduledTasks) ? [...scheduledTasks].sort((a, b) => Number(a.state) - Number(b.state)) : [];

    const handleDeleteTask = (taskId: string) => {
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

                            <OnPressSwitchComponent markiseState={markiseState} onSend={handleSend} />

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
                                    id="switch-regen-block"
                                    name="switch-regen-block"
                                />
                                <SwitchComponent
                                    checked={markiseStatus['weather:windy'] === 'closing'}
                                    label="Wind block"
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                    id="switch-wind-block"
                                    name="switch-wind-block"
                                />
                                <SwitchComponent
                                    checked={markiseStatus.throttling_active === 'true'}
                                    label="Drosselung"
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                    id="switch-drosselung"
                                    name="switch-drosselung"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <SchedulerCard
                        initialTopic="markise/switch/haupt/set"
                        mqttTopics={["markise/switch/haupt/set"]}
                        topicDescriptions={["Markise"]}
                        scheduledTasks={scheduledTasks}
                        setScheduledTasks={setScheduledTasks}
                        setReloadTasks={setReloadTasks}
                        taskToCopy={copiedTask}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardHeader title="Eingestellte Zeitpläne" />
                        <CardContent>
                            {scheduledTasks.length === 0 ? (
                                <Typography variant="body1">Keine eingestellten Zeitpläne.</Typography>
                            ) : (
                                <ScheduledTaskCard
                                    zoneName="Markise"
                                    tasks={sortedTasks}
                                    customLabels={customMarkiseLabels}
                                    onDelete={handleDeleteTask}
                                    redisKey="markise/switch/haupt/set"
                                    onCopyTask={setCopiedTask}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </>
        </Layout>
    );
};

export default MarkisePage;
