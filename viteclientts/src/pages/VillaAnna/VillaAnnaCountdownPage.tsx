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
    SelectChangeEvent,
    Button,
    Box,
    Typography,
} from '@mui/material';
import { zoneOrder, bewaesserungsTopicsSet } from '../../components/constants';
import { HourField, MinuteField } from '../../components/index';
import CountdownCard from '../../components/CountdownCard';
import useSnackbar from '../../utils/useSnackbar';
import { CountdownsState } from '../../types/types';
import { messages } from '../../utils/messages';
import { useQuery } from '@tanstack/react-query';

const VillaAnnacountdownPage = () => {
    const { showSnackbar } = useSnackbar();
    const [selectedZone, setSelectedZone] = useState(zoneOrder[0]);
    const [selectedHour, setSelectedHour] = useState<string>('0');
    const [selectedMinute, setSelectedMinute] = useState<string>('10');
    const [sending, setSending] = useState(false);
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
            setSending(true);
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
                    showSnackbar('Fehler', 'error');
                })
                .finally(() => setSending(false));
        }
    };

    // React Query: poll current countdowns
    const countdownsQuery = useQuery<CountdownsState>({
        queryKey: ['countdowns', 'current'],
        queryFn: async () => {
            const res = await fetch(`${apiUrl}/countdown/currentCountdowns`);
            if (!res.ok) throw new Error('countdowns');
            return res.json();
        },
        refetchInterval: 1000,
        refetchOnWindowFocus: false,
    });

    return (
        <Layout>
            {/* Page container aligned with Layout gutters (avoid double padding) */}
            <Box sx={{ px: { xs: 0, md: 0 }, py: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
                {/* Header aligned with HomePage */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: 'primary.main',
                            mb: 1,
                            fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                    >
                        Bewässerungs-Timer
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', md: '1rem' } }}
                    >
                        Countdown je Zone steuern
                    </Typography>
                </Box>

                <Grid size={12}>
                    <Card variant='outlined' sx={{ borderRadius: 2 }}>
                        <CardHeader
                            title={'Countdown einstellen'}
                            slotProps={{ title: { sx: { fontWeight: 600 } } }}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid size={12}>
                                    <FormControl fullWidth>
                                        <InputLabel id="zone-select-label">Zone</InputLabel>
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
                                    <Button variant='contained' color='primary' fullWidth onClick={() => handleSendTopic('start')} disabled={sending} aria-busy={sending}>
                                        Start
                                    </Button>
                                </Grid>
                                <Grid size={12}>
                                    <Button variant='contained' color='info' fullWidth onClick={() => handleSendTopic('stop')} disabled={sending} aria-busy={sending}>
                                        Stopp
                                    </Button>
                                </Grid>
                                <Grid size={12}>
                                    <Button variant='contained' color='warning' fullWidth onClick={() => handleSendTopic('reset')} disabled={sending} aria-busy={sending}>
                                        Zurücksetzen
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={12} sx={{ mt: 2 }}>
                    <Card variant='outlined' sx={{ borderRadius: 2 }}>
                        <CardHeader
                            title='Countdowns'
                            slotProps={{ title: { sx: { fontWeight: 600 } } }}
                        />
                        <CardContent>
                            {zoneOrder.map(zoneName => {
                                const topic = bewaesserungsTopicsSet[zoneOrder.indexOf(zoneName)];
                                const countdown = (countdownsQuery.data || {})[topic];
                                if (!countdown) return null; // Skip rendering if there's no countdown data for this topic
                                return (
                                    <CountdownCard key={topic} zoneName={zoneName} countdown={countdown} />
                                );
                            })}
                        </CardContent>
                    </Card>
                </Grid>
            </Box>
        </Layout>
    );
};

export default VillaAnnacountdownPage;
