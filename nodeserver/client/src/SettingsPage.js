import React, { useEffect, useState } from 'react';
import BackButton from './components/BackButton';
import axios from 'axios';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Container,
    TextField,
    Button,
    Snackbar,
    Alert,
    TextareaAutosize
} from '@mui/material';
import SecretField from './components/SecretField';

const SettingsPage = () => {
    const [gptRequest, setGptRequest] = useState('');
    const [influxDbAiToken, setInfluxDbAiToken] = useState('');
    const [influxDbAutomationToken, setInfluxDbAutomationToken] = useState('');
    const [openAiApiToken, setOpenAiApiToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [influxDbAiTokenExists, setInfluxDbAiTokenExists] = useState(false);
    const [influxDbAutomationTokenExists, setInfluxDbAutomationTokenExists] = useState(false);
    const [openAiApiTokenExists, setOpenAiApiTokenExists] = useState(false);
    const [passwordExists, setPasswordExists] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isFocused, setIsFocused] = useState({
        influxDbAiToken: false,
        influxDbAutomationToken: false,
        openAiApiToken: false,
        newPassword: false
    });
    const [fieldValidity, setFieldValidity] = useState({
        influxDbAiToken: true,
        influxDbAutomationToken: true,
        openAiApiToken: true,
        newPassword: true
    })
    const apiUrl = process.env.REACT_APP_API_URL;

    useEffect(() => {
        axios.get(`${apiUrl}/getGptRequest`)
            .then(response => {
                setGptRequest(response.data.gptRequest);
            })
            .catch(error => {
                console.error('Error fetching GPT request:', error);
            });
    }, [apiUrl]);

    const handleUpdate = () => {
        axios.post(`${apiUrl}/updateGptRequest`, { newGptRequest: gptRequest })
            .then(() => {
                setOpenSnackbar(true);
            })
            .catch(error => {
                console.error('Error updating GPT request:', error);
            });
    };

    useEffect(() => {
        axios.get(`${apiUrl}/getSecrets`)
            .then(response => {
                setInfluxDbAiTokenExists(response.data.influxDbAiTokenExists);
                setInfluxDbAutomationTokenExists(response.data.influxDbAutomationTokenExists);
                setOpenAiApiTokenExists(response.data.openAiApiTokenExists);
                setPasswordExists(response.data.passwordExists);
            })
            .catch(error => {
                console.error('Error fetching secrets:', error);
            });
    }, [apiUrl]);

    const handleUpdateSecret = (secretType, value) => {
        const isValid = value !== '';
        setFieldValidity({ ...fieldValidity, [secretType]: isValid });

        const payload = { [secretType]: value };

        axios.post(`${apiUrl}/updateSecrets`, payload)
            .then((response) => {
                setSuccessMessage(response.data);
                setOpenSnackbar(true);
            })
            .catch(error => {
                console.error(`Error updating ${secretType}:`, error);
            });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnackbar(false);
    };

    const handleFocus = (field) => {
        setIsFocused({ ...isFocused, [field]: true });
      };
      
      const handleBlur = (field) => {
        setIsFocused({ ...isFocused, [field]: false });
      };

    return (
        <Container>
            <Box sx={{ width: { xs: '100%', md: '60%' }, mx: 'auto' }}>
                <Grid container spacing={3} justify="center" alignItems="center">
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box sx={{ alignSelf: 'flex-start' }}>
                                <BackButton />
                            </Box>
                            <Typography variant="h3" align="center">Settings</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardHeader title="Edit GPT Request" />
                            <CardContent>
                                <TextField
                                    label="GPT Request"
                                    variant="outlined"
                                    fullWidth
                                    multiline
                                    InputProps={{
                                        inputComponent: TextareaAutosize,
                                        inputProps: {
                                            minRows: 3,
                                            value: gptRequest,
                                            onChange: (e) => setGptRequest(e.target.value),
                                            spellCheck: false
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleUpdate}
                                    sx={{ mt: 2 }}
                                >
                                    Update GPT Request
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardHeader title="Edit Secrets" />
                            <CardContent>
                                <SecretField
                                    label="InfluxDB AI Token"
                                    secretValue={influxDbAiToken}
                                    placeholder={influxDbAiTokenExists}
                                    isFocused={isFocused.influxDbAiToken}
                                    isValid={fieldValidity.influxDbAiToken}
                                    onFocus={() => handleFocus('influxDbAiToken')}
                                    onBlur={() => handleBlur('influxDbAiToken')}
                                    onChange={(value) => setInfluxDbAiToken(value)}
                                    onUpdate={() => handleUpdateSecret('influxDbAiToken', influxDbAiToken)}
                                />
                                <SecretField
                                    label="InfluxDB Automation Token"
                                    secretValue={influxDbAutomationToken}
                                    placeholder={influxDbAutomationTokenExists}
                                    isFocused={isFocused.influxDbAutomationToken}
                                    isValid={fieldValidity.influxDbAutomationToken}
                                    onFocus={() => handleFocus('influxDbAutomationToken')}
                                    onBlur={() => handleBlur('influxDbAutomationToken')}
                                    onChange={(value) => setInfluxDbAutomationToken(value)}
                                    onUpdate={() => handleUpdateSecret('influxDbAutomationToken', influxDbAutomationToken)}
                                />
                                <SecretField
                                    label="OpenAI API Token"
                                    secretValue={openAiApiToken}
                                    placeholder={openAiApiTokenExists}
                                    isFocused={isFocused.openAiApiToken}
                                    isValid={fieldValidity.openAiApiToken}
                                    onFocus={() => handleFocus('openAiApiToken')}
                                    onBlur={() => handleBlur('openAiApiToken')}
                                    onChange={(value) => setOpenAiApiToken(value)}
                                    onUpdate={() => handleUpdateSecret('openAiApiToken', openAiApiToken)}
                                />
                                <SecretField
                                    label="New Password"
                                    type='password'
                                    secretValue={newPassword}
                                    placeholder={passwordExists}
                                    isFocused={isFocused.newPassword}
                                    isValid={fieldValidity.newPassword}
                                    onFocus={() => handleFocus('newPassword')}
                                    onBlur={() => handleBlur('newPassword')}
                                    onChange={(value) => setNewPassword(value)}
                                    onUpdate={() => handleUpdateSecret('newPassword', newPassword)}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="success">
                    {successMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default SettingsPage;
