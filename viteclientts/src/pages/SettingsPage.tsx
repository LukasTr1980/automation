// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import Layout from "../Layout";
import axios from "axios";
import {
    Grid,
    Card,
    CardContent,
    CardHeader,
} from "@mui/material";
import SecretField from "../components/SecretField";
import useSnackbar from "../utils/useSnackbar";
import { useTranslation } from "react-i18next";

const SettingsPage: React.FC = () => {
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();
    const apiUrl = import.meta.env.VITE_API_URL;

    // ─── secret states ───────────────────────────────────────────
    const [influxDbAiToken, setInfluxDbAiToken] = useState("");
    const [influxDbAutomationToken, setInfluxDbAutomationToken] = useState("");
    const [openAiApiToken, setOpenAiApiToken] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [exists, setExists] = useState({
        influxDbAiToken: false,
        influxDbAutomationToken: false,
        openAiApiToken: false,
        password: false,
    });

    const [focused, setFocused] = useState({
        influxDbAiToken: false,
        influxDbAutomationToken: false,
        openAiApiToken: false,
        newPassword: false,
    });

    const [valid, setValid] = useState({
        influxDbAiToken: true,
        influxDbAutomationToken: true,
        openAiApiToken: true,
        newPassword: true,
    });

    // ─── initial existence flags ─────────────────────────────────
    useEffect(() => {
        axios
            .get(`${apiUrl}/getSecrets`)
            .then(({ data }) =>
                setExists({
                    influxDbAiToken: data.influxDbAiTokenExists,
                    influxDbAutomationToken: data.influxDbAutomationTokenExists,
                    openAiApiToken: data.openAiApiTokenExists,
                    password: data.passwordExists,
                })
            )
            .catch(console.error);
    }, [apiUrl]);

    // ─── handlers ────────────────────────────────────────────────
    const handleUpdateSecret = (key: string, value: string) => {
        const isValid = value.trim() !== "";
        setValid((s) => ({ ...s, [key]: isValid }));
        if (!isValid) return;

        axios
            .post(`${apiUrl}/updateSecrets`, { [key]: value })
            .then(({ data }) => showSnackbar(t(data)))
            .catch(console.error);
    };

    const setFocus = (key: string, on: boolean) =>
        setFocused((s) => ({ ...s, [key]: on }));

    // ─── UI ──────────────────────────────────────────────────────
    const title = `Villa Anna ${t("settings")}`;

    return (
        <Layout title={title}>
            <Grid size={12}>
                <Card variant="outlined">
                    <CardHeader title={t("editSecrets")} />
                    <CardContent>
                        <SecretField
                            label="InfluxDB AI Token"
                            secretValue={influxDbAiToken}
                            placeholder={exists.influxDbAiToken}
                            isFocused={focused.influxDbAiToken}
                            isValid={valid.influxDbAiToken}
                            onFocus={() => setFocus("influxDbAiToken", true)}
                            onBlur={() => setFocus("influxDbAiToken", false)}
                            onChange={setInfluxDbAiToken}
                            onUpdate={() =>
                                handleUpdateSecret("influxDbAiToken", influxDbAiToken)
                            }
                        />
                        <SecretField
                            label="InfluxDB Automation Token"
                            secretValue={influxDbAutomationToken}
                            placeholder={exists.influxDbAutomationToken}
                            isFocused={focused.influxDbAutomationToken}
                            isValid={valid.influxDbAutomationToken}
                            onFocus={() => setFocus("influxDbAutomationToken", true)}
                            onBlur={() => setFocus("influxDbAutomationToken", false)}
                            onChange={setInfluxDbAutomationToken}
                            onUpdate={() =>
                                handleUpdateSecret(
                                    "influxDbAutomationToken",
                                    influxDbAutomationToken
                                )
                            }
                        />
                        <SecretField
                            label="OpenAI API Token"
                            secretValue={openAiApiToken}
                            placeholder={exists.openAiApiToken}
                            isFocused={focused.openAiApiToken}
                            isValid={valid.openAiApiToken}
                            onFocus={() => setFocus("openAiApiToken", true)}
                            onBlur={() => setFocus("openAiApiToken", false)}
                            onChange={setOpenAiApiToken}
                            onUpdate={() =>
                                handleUpdateSecret("openAiApiToken", openAiApiToken)
                            }
                        />
                        <SecretField
                            label="Password"
                            type="password"
                            secretValue={newPassword}
                            placeholder={exists.password}
                            isFocused={focused.newPassword}
                            isValid={valid.newPassword}
                            onFocus={() => setFocus("newPassword", true)}
                            onBlur={() => setFocus("newPassword", false)}
                            onChange={setNewPassword}
                            onUpdate={() => handleUpdateSecret("newPassword", newPassword)}
                            autoComplete="new-password"
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Layout>
    );
};

export default SettingsPage;
