import { useState, FormEvent } from 'react';
import { TextField, Typography, Box, Button } from '@mui/material';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { setRole } = useUserStore();
  const [, setCookie] = useCookies(['session', 'username']);
  const navigate = useNavigate();
  const isSecureCookie = import.meta.env.VITE_SECURE_COOKIE === 'true';
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });

      if (response.data.status === 'success') {
        setCookie('session', response.data.session, { path: '/', secure: isSecureCookie });
        setCookie('username', username, { path: '/', secure: isSecureCookie });
        setRole(response.data.role);
        navigate('/home');
        showSnackbar(response.data.message, 'success');
      } else {
        showSnackbar(response.data.message, 'error');
      }
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 400 || status === 401) {
          errorMessage = error.response.data.message || errorMessage;
        }
      } else if (error instanceof Error) {
        console.error('Error:', error.message);
      } else {
        console.error('An unknown error occurred:', error);
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  return (
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
      <Button
        type="submit"
        variant='contained'
      >
        Login
      </Button>
    </Box>
  );
};

export default LoginForm;
