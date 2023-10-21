// Importing necessary libraries and components
import { useState } from 'react';
import axios from 'axios';
import Layout from '../../Layout';
import { FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent, CardHeader, Button } from '@mui/material';
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

    const handleSendTopic = () => {
        const selectedTopic = bewaesserungsTopics[zoneOrder.indexOf(selectedZone)];
        axios.post(`${apiUrl}/countdown/setCountdown`, { topic: selectedTopic })
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
                        <Grid container spacing={2}>
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
                            </Grid>
                        <Grid item xs={12}>
                            <Button variant='contained' color='primary' fullWidth onClick={handleSendTopic}>
                                Start
                            </Button>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
        </Layout>
    );
};

export default VillaAnnacountdownPage;
