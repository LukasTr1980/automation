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

const SettingsPage = () => {
    const [gptRequest, setGptRequest] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
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

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnackbar(false);
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
                </Grid>
            </Box>
            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="success">
                    GPT request updated successfully!
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default SettingsPage;
