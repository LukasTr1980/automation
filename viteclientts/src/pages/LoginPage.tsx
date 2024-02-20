import { useState, FormEvent, useEffect } from 'react';
import { Avatar, Box, Container, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';
import { useTranslation } from 'react-i18next';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { CopyrightProps } from '../types/types';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { setUserLogin, setHasVisitedBefore, setLogoutInProgress, setTokenAndExpiry, setDeviceId, setBrowserInfo } = useUserStore();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const [loginButtonLoading, setLoginButtonLoading] = useState<boolean>(false);
  const { t } = useTranslation();

  function Copyright(props: CopyrightProps) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={props.sx}>
        {'Copyright © '}
        Lukas Tröbinger
        {' '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginButtonLoading(true);

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });

      if (response.status === 200) {
        setUserLogin(username);
        setTokenAndExpiry(response.data.accessToken);
        setHasVisitedBefore(true);
        setDeviceId(response.data.deviceId);
        setBrowserInfo();
        navigate('/home');

        const backendMessageKey = response.data.message;
        const translatedMessage = t(backendMessageKey);

        showSnackbar(translatedMessage, 'success');
      } else {
        const backendMessageKey = response.data.message;
        const translatedMessage = t(backendMessageKey);
        showSnackbar(translatedMessage, 'error');
      }
    } catch (error) {
      let errorMessage = t('anUnexpectedErrorOccurred');
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 400 || status === 401) {
          const backendMessageKey = error.response.data.message;
          const translatedMessage = t(backendMessageKey);
          errorMessage = translatedMessage || errorMessage;
        }
      } else if (error instanceof Error) {
        console.error('Error:', error.message);
      } else {
        console.error('An unknown error occurred:', error);
      }
      showSnackbar(errorMessage, 'error');
    }
    setLoginButtonLoading(false);
  };

  useEffect(() => {
    setLogoutInProgress(false);
  }, []);

  return (
    <Container component='main' maxWidth="xs">
      <Box
        sx={{
          marginTop: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main', marginTop: 8 }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Login Automation
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 1 }}
          noValidate
        >
          <TextField
            margin='normal'
            fullWidth
            label="Username"
            id='username'
            name='username'
            autoComplete='username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            spellCheck={false}
          />
          <TextField
            margin='normal'
            name='password'
            id='password'
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete='password'
            spellCheck={false}
          />
          <LoadingButton
            type="submit"
            fullWidth
            variant='contained'
            loading={loginButtonLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </LoadingButton>
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
};

export default LoginForm;
