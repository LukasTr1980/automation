import { useEffect, useState } from 'react';
import Layout from '../Layout';
import axios from 'axios';
import {
    Grid2,
    Card,
    CardContent,
    CardHeader,
    TextField,
    TextareaAutosize,
    Button
} from '@mui/material';
import SecretField from '../components/SecretField';
import useSnackbar from '../utils/useSnackbar';
import { useTranslation } from 'react-i18next';

const SettingsPage: React.FC = () => {
    const TextareaAutosizeComponent: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = TextareaAutosize;
    const { showSnackbar } = useSnackbar();
    const [gptRequest, setGptRequest] = useState<string>('');
    const [influxDbAiToken, setInfluxDbAiToken] = useState<string>('');
    const [influxDbAutomationToken, setInfluxDbAutomationToken] = useState<string>('');
    const [openAiApiToken, setOpenAiApiToken] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [influxDbAiTokenExists, setInfluxDbAiTokenExists] = useState<boolean>(false);
    const [influxDbAutomationTokenExists, setInfluxDbAutomationTokenExists] = useState<boolean>(false);
    const [openAiApiTokenExists, setOpenAiApiTokenExists] = useState<boolean>(false);
    const [passwordExists, setPasswordExists] = useState<boolean>(false);
    const { t } = useTranslation();
    const [isFocused, setIsFocused] = useState<{ [key: string]: boolean }>({
        influxDbAiToken: false,
        influxDbAutomationToken: false,
        openAiApiToken: false,
        newPassword: false
    });
    const [fieldValidity, setFieldValidity] = useState<{ [key: string]: boolean }>({
        influxDbAiToken: true,
        influxDbAutomationToken: true,
        openAiApiToken: true,
        newPassword: true
    });
    const apiUrl = import.meta.env.VITE_API_URL;

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
            .then((response) => {
                const backendMessageKey = response.data;
                const translatedMessage = t(backendMessageKey);
                showSnackbar(translatedMessage);
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

    const handleUpdateSecret = (secretType: string, value: string) => {
        const isValid = value !== '';
        setFieldValidity({ ...fieldValidity, [secretType]: isValid });

        const payload = { [secretType]: value };

        axios.post(`${apiUrl}/updateSecrets`, payload)
            .then((response) => {
                const backendMessageKey = response.data;
                const translatedMessage = t(backendMessageKey);
                showSnackbar(translatedMessage);
            })
            .catch(error => {
                console.error(`Error updating ${secretType}:`, error);
            });
    };

    const handleFocus = (field: string) => {
        setIsFocused({ ...isFocused, [field]: true });
    };

    const handleBlur = (field: string) => {
        setIsFocused({ ...isFocused, [field]: false });
    };

    return (
        <Layout title={t('settings')}>
            <Grid2 size={12} paddingTop={1} paddingBottom={1}>
                <Card variant='outlined'>
                    <CardHeader title={t("editGptRequest")} />
                    <CardContent>
                        <TextField
                            id="textFieldGptRequest"
                            name="textFieldGptRequest"
                            label="GPT Request"
                            variant="outlined"
                            fullWidth
                            multiline
                            rows={3}
                            slotProps={{
                                input: {
                                    inputComponent: TextareaAutosizeComponent,
                                    inputProps: {
                                        minRows: 3,
                                        value: gptRequest,
                                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setGptRequest(e.target.value),
                                        spellCheck: false
                                    }
                                }
                            }}
                        />
                        <Button
                            onClick={handleUpdate}
                            variant='contained'
                            sx={{ width: '300px', my: 2 }}
                        >
                            Update
                        </Button>
                    </CardContent>
                </Card>
            </Grid2>

            <Grid2 size={12}>
                <Card variant='outlined'>
                    <CardHeader title={t("editSecrets")} />
                    <CardContent>
                        <SecretField
                            label="InfluxDB AI Token"
                            secretValue={influxDbAiToken}
                            placeholder={influxDbAiTokenExists}
                            isFocused={isFocused.influxDbAiToken}
                            isValid={fieldValidity.influxDbAiToken}
                            onFocus={() => handleFocus('influxDbAiToken')}
                            onBlur={() => handleBlur('influxDbAiToken')}
                            onChange={(value: string) => setInfluxDbAiToken(value)}
                            onUpdate={() => handleUpdateSecret('influxDbAiToken', influxDbAiToken)}
                            autoComplete='off'
                        />
                        <SecretField
                            label="InfluxDB Automation Token"
                            secretValue={influxDbAutomationToken}
                            placeholder={influxDbAutomationTokenExists}
                            isFocused={isFocused.influxDbAutomationToken}
                            isValid={fieldValidity.influxDbAutomationToken}
                            onFocus={() => handleFocus('influxDbAutomationToken')}
                            onBlur={() => handleBlur('influxDbAutomationToken')}
                            onChange={(value: string) => setInfluxDbAutomationToken(value)}
                            onUpdate={() => handleUpdateSecret('influxDbAutomationToken', influxDbAutomationToken)}
                            autoComplete='off'
                        />
                        <SecretField
                            label="OpenAI API Token"
                            secretValue={openAiApiToken}
                            placeholder={openAiApiTokenExists}
                            isFocused={isFocused.openAiApiToken}
                            isValid={fieldValidity.openAiApiToken}
                            onFocus={() => handleFocus('openAiApiToken')}
                            onBlur={() => handleBlur('openAiApiToken')}
                            onChange={(value: string) => setOpenAiApiToken(value)}
                            onUpdate={() => handleUpdateSecret('openAiApiToken', openAiApiToken)}
                            autoComplete='off'
                        />
                        <SecretField
                            label="Password"
                            type='password'
                            secretValue={newPassword}
                            placeholder={passwordExists}
                            isFocused={isFocused.newPassword}
                            isValid={fieldValidity.newPassword}
                            onFocus={() => handleFocus('newPassword')}
                            onBlur={() => handleBlur('newPassword')}
                            onChange={(value: string) => setNewPassword(value)}
                            onUpdate={() => handleUpdateSecret('newPassword', newPassword)}
                            autoComplete='new-password'
                        />
                    </CardContent>
                </Card>
            </Grid2>
        </Layout>
    );
};

export default SettingsPage;
