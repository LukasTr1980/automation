//VillaAnnaCountdownPage.jsx
import { useEffect, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import Layout from '../../Layout';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Button,
    Typography,
} from '@mui/material';
import { zoneOrder, bewaesserungsTopics } from '../../components/constants';
import { HourField, MinuteField } from '../../components/index';
import CountdownCard from '../../components/CountdownCard';
import { SnackbarContext } from '../../components/snackbar/SnackbarContext';
import { SocketContext } from '../../components/socketio/SocketContext';

const VillaAnnacountdownPage = () => {
    const { socket, connected } = useContext(SocketContext);
    const { showSnackbar } = useContext(SnackbarContext);
    const [selectedZone, setSelectedZone] = useState(zoneOrder[0]);
    const [selectedHour, setSelectedHour] = useState(0);
    const [selectedMinute, setSelectedMinute] = useState(10);
    const [countdowns, setCountdowns] = useState({});
    const [fieldValidity, setFieldvalidity] = useState({
        hour: true,
        minute: true
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    const handleZoneChange = (event) => {
        setSelectedZone(event.target.value);
    }

    const handleSendTopic = (action) => {
        const isValid = {
            hour: selectedHour !== '',
            minute: selectedMinute !== '',
        }

        setFieldvalidity(isValid);

        if (Object.values(isValid).every(Boolean)) {
            const selectedTopic = bewaesserungsTopics[zoneOrder.indexOf(selectedZone)];
            axios.post(`${apiUrl}/countdown/setCountdown`, {
                topic: selectedTopic,
                hours: selectedHour,
                minutes: selectedMinute,
                action: action
            })
                .then(response => {
                    showSnackbar(response.data);
                })
                .catch(error => {
                    console.error('Error', error);
                });
        }
    };

    // Define your fetching function
    const fetchCurrentCountdowns = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/countdown/currentCountdowns`);
            setCountdowns(response.data);
        } catch (error) {
            console.error('Error fetching current countdowns', error);
        }
    }, [apiUrl]);  // dependencies for useCallback

    useEffect(() => {
        // Fetch on mount
        fetchCurrentCountdowns();
    }, [fetchCurrentCountdowns]);

    useEffect(() => {
        if (socket && connected) {  // Check connected status
            socket.on("redis-countdown-update", (data) => {
                console.log(data);
                setCountdowns(prevCountdowns => ({
                    ...prevCountdowns,
                    [data.topic]: {
                        hours: data.countdownHours,
                        minutes: data.countdownMinutes,
                        control: data.countdownControl,
                        value: data.countdownValue,
                    }
                }));
            });
        }
        return () => {
            if (socket) {
                socket.off("redis-countdown-update");  // Clean up event listener
            }
        };
    }, [socket, connected]);  

    return (
        <Layout title="Villa Anna Countdown">
            <Grid item xs={12}>
                <Card>
                    <CardHeader title="Countdown einstellen" />
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="zone-select-label">Zone</InputLabel>
                                    <Select
                                        labelId="zone-select-label"
                                        value={selectedZone}
                                        onChange={handleZoneChange}
                                    >
                                        {zoneOrder.map((zone, i) => (
                                            <MenuItem value={zone} key={bewaesserungsTopics[i]}>
                                                {zone}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <HourField
                                    selectedHour={selectedHour}
                                    setSelectedHour={setSelectedHour}
                                    error={!fieldValidity.hour}
                                    min={0}
                                    max={99}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <MinuteField
                                    selectedMinute={selectedMinute}
                                    setSelectedMinute={setSelectedMinute}
                                    error={!fieldValidity.minute}
                                    min={1}
                                    max={99}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant='contained' color='primary' fullWidth onClick={() => handleSendTopic('start')}>
                                    Start
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant='contained' color='info' fullWidth onClick={() => handleSendTopic('stop')}>
                                    Stop
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button variant='contained' color='warning' fullWidth onClick={() => handleSendTopic('reset')}>
                                    Reset
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12}>
                <Card>
                    <CardHeader title={<Typography variant="h6">Countdowns</Typography>} />  {/* Adjusted title */}
                    <CardContent>
                        {zoneOrder.map(zoneName => {
                            const topic = bewaesserungsTopics[zoneOrder.indexOf(zoneName)];
                            const countdown = countdowns[topic];
                            if (!countdown) return null;  // Skip rendering if there's no countdown data for this topic
                            return (
                                <CountdownCard key={topic} zoneName={zoneName} countdown={countdown} />
                            );
                        })}
                    </CardContent>
                </Card>
            </Grid>
        </Layout>
    );
};

export default VillaAnnacountdownPage;
