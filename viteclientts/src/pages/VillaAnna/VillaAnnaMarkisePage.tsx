import { useContext, useEffect, useState, useCallback } from 'react';
import { Typography, Grid, Card, CardHeader, CardContent, Box } from '@mui/material';
import OnPressSwitchComponent from '../../components/OnPressSwitchComponent';
import SchedulerCard from '../../components/SchedulerCard';
import ScheduledTaskCard from '../../components/ScheduledTaskCard';
import axios from 'axios';
import Layout from '../../Layout'
import { SocketContext } from '../../components/socketio/SocketContext';
import SwitchComponent from '../../components/switchComponent';
import useSnackbar from '../../utils/useSnackbar';
import { MarkiseStatus, ScheduledTask, APIResponse } from '../../types/types';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../utils/store';

const MarkisePage = () => {
    const { jwtToken } = useUserStore();
    const [markiseStatus, setMarkiseStatus] = useState<MarkiseStatus>({});
    const { socket, connected } = useContext(SocketContext);
    const [switchesLoaded, setSwitchesLoaded] = useState(false);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const isLoading = !(switchesLoaded && tasksLoaded);
    const [markiseState, setMarkiseState] = useState(null);
    const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
    const [reloadTasks, setReloadTasks] = useState(false);
    const customMarkiseLabels = { '1': "Ausfahren", '2': "Einfahren" };
    const apiUrl = import.meta.env.VITE_API_URL;
    const [copiedTask, setCopiedTask] = useState<ScheduledTask | null>(null);
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();
    const title = `Villa Anna ${t('awning')}`;

    useEffect(() => {
        const url = jwtToken ? `${apiUrl}/mqtt?token=${jwtToken}&checkIrrigation=false` : `${apiUrl}/mqtt?checkIrrigation=false`;
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'switchState') {
                if (data.topic && data.topic === 'markise/switch/haupt') {
                    setMarkiseState(data.state);
                    setSwitchesLoaded(true);
                }

                else if (data.latestStates && data.latestStates['markise/switch/haupt'] !== undefined) {
                    setMarkiseState(data.latestStates['markise/switch/haupt']);
                    setSwitchesLoaded(true);
                }
            }
        };

        return () => {
            eventSource.close();
        };
    }, [jwtToken, apiUrl]);

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
                const backendMessageKey = response.data;
                const translatedMessage = t(backendMessageKey);
                showSnackbar(translatedMessage);
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
        <Layout title={title} loading={isLoading}>
            <>
                <Grid item xs={12} paddingTop={1} paddingBottom={1}>
                    <Card variant='outlined'>
                        <CardHeader title={t('controlAwning')} />
                        <CardContent>

                            <OnPressSwitchComponent markiseState={markiseState} onSend={handleSend} />

                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} paddingBottom={1}>
                    <Card variant='outlined'>
                        <CardHeader title={t('weatherBlock')} />
                        <CardContent>
                            <Box display="flex" justifyContent="center" alignItems="center" gap={3}>
                                <SwitchComponent
                                    checked={markiseStatus['weather:raining'] === 'closing'}
                                    label={t('rainBlock')}
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                    id="switch-regen-block"
                                    name="switch-regen-block"
                                />
                                <SwitchComponent
                                    checked={markiseStatus['weather:windy'] === 'closing'}
                                    label={t('windBlock')}
                                    handleToggle={() => { }}
                                    disabled
                                    color='warning'
                                    id="switch-wind-block"
                                    name="switch-wind-block"
                                />
                                <SwitchComponent
                                    checked={markiseStatus.throttling_active === 'true'}
                                    label={t('throttling')}
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
                <Grid item xs={12} paddingBottom={1}>
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
                    <Card variant='outlined'>
                        <CardHeader title={t("scheduledPlans")} />
                        <CardContent>
                            {scheduledTasks.length === 0 ? (
                                <Typography variant="body1">{t('noScheduledPlans')}</Typography>
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
