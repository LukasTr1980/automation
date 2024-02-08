import { useState, FormEvent, useCallback, useEffect } from 'react';
import { Box, TextField, Typography, Grid } from '@mui/material';
import { LoadingButton } from '@mui/lab'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { setPreviousLastLogin, setUserLogin, jwtToken, userLogin, hasVisitedBefore, setHasVisitedBefore, setLogoutInProgress, setTokenAndExpiry } = useUserStore();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const [loginButtonLoading, setLoginButtonLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin });
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
        navigate('/home');
      }
    } catch (error) {
      showSnackbar(t('invalidOrExpiredToken'), 'warning');
    }
    setIsLoading(false);
  }, [apiUrl, navigate, userLogin, setTokenAndExpiry]); //Excluded showSnackbar and t to avoid multiple renderings

  useEffect(() => {
    let isMounted = true;

    const checkAuthState = async () => {
      if (hasVisitedBefore) {
        if (jwtToken) {
          try {
            const verifyResponse = await axios.post(`${apiUrl}/verifyToken`);
            if (verifyResponse.status === 200) {
              navigate('/home');
              return;
            }
          } catch (error) {
            await refreshToken();
          }
        } else {
          await refreshToken();
        }
      }
      if (isMounted) setIsLoading(false);
    };

    checkAuthState();

    return () => {
      isMounted = false;
    };
  }, [jwtToken, refreshToken, navigate, hasVisitedBefore, apiUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginButtonLoading(true);

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });

      if (response.data.status === 'success') {
        setUserLogin(username);
        setTokenAndExpiry(response.data.accessToken);
        setHasVisitedBefore(true);
        setPreviousLastLogin((response.data.previousLastLogin));
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
    <>
      {isLoading ? (
        <Grid container>
          <LoadingSpinner />
        </Grid>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit}
          border={1}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '300px',
            margin: '0 auto',
            p: 2,
            gap: 2,
          }}
          noValidate
          autoComplete="off"
        >
          <Typography variant="h5">Login Villa Anna Automation</Typography>
          <TextField
            label="Username"
            variant="outlined"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            InputLabelProps={{
              shrink: true,
              style: { transition: "none" },
            }}
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputLabelProps={{
              shrink: true,
              style: { transition: "none" },
            }}
          />
          <LoadingButton
            type="submit"
            variant='contained'
            loading={loginButtonLoading}
          >
            Login
          </LoadingButton>
        </Box>
      )}
    </>
  );
};

export default LoginForm;
