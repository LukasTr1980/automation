//VillaAnnaCountdownPage.jsx
import { useState } from 'react';
import axios from 'axios';
import Layout from '../../Layout';
import {
    FormControl,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Button,
    Box,
    Typography,
    ToggleButton,
    FormLabel,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CircularProgress from '@mui/material/CircularProgress';
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
    const [sendingAction, setSendingAction] = useState<null | 'start' | 'stop' | 'reset'>(null);
    const [fieldValidity, setFieldvalidity] = useState({
        hour: true,
        minute: true
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    // Zone selection handled by standalone ToggleButtons

    const handleSendTopic = (action: 'start' | 'stop' | 'reset') => {
        const isValid = {
            hour: selectedHour !== '',
            minute: selectedMinute !== '',
        }

        setFieldvalidity(isValid);

        if (Object.values(isValid).every(Boolean)) {
            const selectedTopic = bewaesserungsTopicsSet[zoneOrder.indexOf(selectedZone)];
            setSending(true);
            setSendingAction(action);
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
                .finally(() => { setSending(false); setSendingAction(null); });
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

    // Derive running countdowns (only show active ones)
    const countdowns = countdownsQuery.data || {};
    // Only show stopped or running; hide reset
    const entries = Object.entries(countdowns).filter(([_, c]) => !!c && c.control?.toLowerCase() !== 'reset');
    const hasAny = entries.length > 0;

    return (
        <Layout>
            {/* Page container aligned with Layout gutters (avoid double padding) */}
            <Box sx={{ px: { xs: 0, md: 0 }, py: { xs: 2, md: 3 }, width: '100%', mx: 'auto' }}>
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
                                    <FormControl fullWidth component="fieldset" sx={{ mb: 1 }}>
                                        <FormLabel id="zone-toggle-label" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>Zone</FormLabel>
                                        <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' }, mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                          {zoneOrder.map((zone, i) => (
                                            <ToggleButton
                                              key={bewaesserungsTopicsSet[i]}
                                              value={zone}
                                              selected={selectedZone === zone}
                                              onClick={() => setSelectedZone(zone)}
                                              aria-label={zone}
                                              sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                px: 1.5,
                                                py: 1,
                                                minWidth: { xs: 120, sm: 140 },
                                                justifyContent: 'center'
                                              }}
                                            >
                                              {zone}
                                            </ToggleButton>
                                          ))}
                                        </Box>
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
                                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                    <Button
                                      variant='contained'
                                      color='success'
                                      size='large'
                                      onClick={() => handleSendTopic('start')}
                                      disabled={sending}
                                      aria-busy={sending && sendingAction === 'start'}
                                      startIcon={sending && sendingAction === 'start' ? <CircularProgress size={18} color='inherit' /> : <PlayArrowIcon />}
                                      disableElevation
                                      sx={{ flex: 1, borderRadius: 2 }}
                                      aria-label='Countdown starten'
                                    >
                                      Start
                                    </Button>
                                    <Button
                                      variant='contained'
                                      color='error'
                                      size='large'
                                      onClick={() => handleSendTopic('stop')}
                                      disabled={sending}
                                      aria-busy={sending && sendingAction === 'stop'}
                                      startIcon={sending && sendingAction === 'stop' ? <CircularProgress size={18} color='inherit' /> : <StopIcon />}
                                      disableElevation
                                      sx={{ flex: 1, borderRadius: 2 }}
                                      aria-label='Countdown stoppen'
                                    >
                                      Stopp
                                    </Button>
                                    <Button
                                      variant='outlined'
                                      color='warning'
                                      size='large'
                                      onClick={() => handleSendTopic('reset')}
                                      disabled={sending}
                                      aria-busy={sending && sendingAction === 'reset'}
                                      startIcon={sending && sendingAction === 'reset' ? <CircularProgress size={18} /> : <RestartAltIcon />}
                                      disableElevation
                                      sx={{ flex: 1, borderRadius: 2 }}
                                      aria-label='Countdown zurücksetzen'
                                    >
                                      Zurücksetzen
                                    </Button>
                                  </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {hasAny && (
                    <Grid size={12} sx={{ mt: 2 }}>
                        <Card variant='outlined' sx={{ borderRadius: 2 }}>
                            <CardHeader
                                title='Countdowns'
                                slotProps={{ title: { sx: { fontWeight: 600 } } }}
                            />
                            <CardContent>
                                {entries.map(([topic, countdown]) => {
                                  const idx = bewaesserungsTopicsSet.indexOf(topic);
                                  const zoneName = idx >= 0 ? zoneOrder[idx] : topic;
                                  return (
                                      <CountdownCard key={topic} zoneName={zoneName} countdown={countdown!} />
                                  );
                                })}
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Box>
        </Layout>
    );
};

export default VillaAnnacountdownPage;
