//VillaAnnaCountdownPage.jsx
import { useEffect, useState } from 'react';
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
    Box,
} from '@mui/material';
import { zoneOrder, bewaesserungsTopics } from '../../components/constants';
import { HourField, MinuteField } from '../../components/index';

const VillaAnnacountdownPage = () => {
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
                    console.log('Response:', response.data);
                })
                .catch(error => {
                    console.error('Error', error);
                });
        }
    };

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const response = await axios.get(`${apiUrl}/countdown/currentCountdowns`);
                setCountdowns(response.data);
            } catch (error) {
                console.error('Error fetching current countdowns', error);
            }
        }
    
        fetchInitialData();
    }, []);

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
                                <Box key={topic} sx={{ p: 2, mb: 2, margin: "10px", border: "1px solid black", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>  {/* Encapsulated in a Box component */}
                                    <Typography variant="h6" align="left" sx={{ mb: 2 }}>{`${zoneName}`}</Typography>  {/* Adjusted variant */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>  {/* Added marginTop */}
                                        <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Verbleibende Zeit:`}</Typography>
                                        <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.value} s`}</Typography>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Engestellte Stunden:`}</Typography>
                                        <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.hours} h`}</Typography>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Eingestellte Minuten:`}</Typography>
                                        <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.minutes} m`}</Typography>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Status:`}</Typography>
                                        <Typography sx={{ mb: 1.5 }} component="span">{countdown.controlStatus}</Typography>
                                    </div>
                                </Box>
                            );
                        })}
                    </CardContent>
                </Card>
            </Grid>
        </Layout>
    );
};

export default VillaAnnacountdownPage;
