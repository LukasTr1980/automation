//VillaAnnaCountdownPage.jsx
import { useEffect, useState, useCallback } from 'react';
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
    SelectChangeEvent,
    Button,
} from '@mui/material';
import { zoneOrder, bewaesserungsTopicsSet } from '../../components/constants';
import { HourField, MinuteField } from '../../components/index';
import CountdownCard from '../../components/CountdownCard';
import useSnackbar from '../../utils/useSnackbar';
import { CountdownsState } from '../../types/types';
import { messages } from '../../utils/messages';

const VillaAnnacountdownPage = () => {
    const { showSnackbar } = useSnackbar();
    const [selectedZone, setSelectedZone] = useState(zoneOrder[0]);
    const [selectedHour, setSelectedHour] = useState<string>('0');
    const [selectedMinute, setSelectedMinute] = useState<string>('10');
    const [countdowns, setCountdowns] = useState<CountdownsState>({});
    const [fieldValidity, setFieldvalidity] = useState({
        hour: true,
        minute: true
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    const handleZoneChange = (event: SelectChangeEvent) => {
        setSelectedZone(event.target.value);
    }

    const handleSendTopic = (action: string) => {
        const isValid = {
            hour: selectedHour !== '',
            minute: selectedMinute !== '',
        }

        setFieldvalidity(isValid);

        if (Object.values(isValid).every(Boolean)) {
            const selectedTopic = bewaesserungsTopicsSet[zoneOrder.indexOf(selectedZone)];
            axios.post(`${apiUrl}/countdown/setCountdown`, {
                topic: selectedTopic,
                hours: selectedHour,
                minutes: selectedMinute,
                action: action
            })
                .then(response => {
                    const backendMessageKey = response.data;
                    const translatedMessage = messages[backendMessageKey] || backendMessageKey;
                    showSnackbar(translatedMessage);
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

    // Simple polling for countdown updates
    useEffect(() => {
        const id = setInterval(() => {
            fetchCurrentCountdowns();
        }, 1000);
        return () => clearInterval(id);
    }, [fetchCurrentCountdowns]);

    return (
        <Layout>
            <Grid size={12} paddingTop={1} paddingBottom={1}>
                <Card variant='outlined'>
                    <CardHeader title={'Countdown einstellen'} />
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="zone-select-label" shrink={false}>Zone</InputLabel>
                                    <Select
                                        labelId="zone-select-label"
                                        value={selectedZone}
                                        onChange={handleZoneChange}
                                    >
                                        {zoneOrder.map((zone, i) => (
                                            <MenuItem value={zone} key={bewaesserungsTopicsSet[i]}>
                                                {zone}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={6}>
                                <HourField
                                    selectedHour={selectedHour}
                                    setSelectedHour={setSelectedHour}
                                    error={!fieldValidity.hour}
                                    min={0}
                                    max={99}
                                />
                            </Grid>
                            <Grid size={6}>
                                <MinuteField
                                    selectedMinute={selectedMinute}
                                    setSelectedMinute={setSelectedMinute}
                                    error={!fieldValidity.minute}
                                    min={0}
                                    max={99}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Button variant='contained' color='primary' fullWidth onClick={() => handleSendTopic('start')}>
                                    Start
                                </Button>
                            </Grid>
                            <Grid size={12}>
                                <Button variant='contained' color='info' fullWidth onClick={() => handleSendTopic('stop')}>
                                    Stopp
                                </Button>
                            </Grid>
                            <Grid size={12}>
                                <Button variant='contained' color='warning' fullWidth onClick={() => handleSendTopic('reset')}>
                                    Zurücksetzen
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
            <Grid size={12} paddingBottom={1}>
                <Card variant='outlined'>
                    <CardHeader title='Countdowns' />
                    <CardContent>
                        {zoneOrder.map(zoneName => {
                            const topic = bewaesserungsTopicsSet[zoneOrder.indexOf(zoneName)];
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
