// Importing necessary libraries and components
import { useState } from 'react';
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
    Button
} from '@mui/material';
import { zoneOrder, bewaesserungsTopics } from '../../components/constants';
import { HourField, MinuteField } from '../../components/index';

const VillaAnnacountdownPage = () => {
    const [selectedZone, setSelectedZone] = useState(zoneOrder[0]);
    const [selectedHour, setSelectedHour] = useState('');
    const [selectedMinute, setSelectedMinute] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL;

    const handleZoneChange = (event) => {
        setSelectedZone(event.target.value);
    }

    const handleSendTopic = (action) => {
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
    };

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
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <MinuteField
                                    selectedMinute={selectedMinute}
                                    setSelectedMinute={setSelectedMinute}
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
        </Layout>
    );
};

export default VillaAnnacountdownPage;
