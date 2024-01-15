import { useState, FormEvent } from 'react';
import { TextField, Typography, Box, Button } from '@mui/material';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [, setCookie] = useCookies(['session', 'username']);
  const navigate = useNavigate();
  const isSecureCookie = import.meta.env.VITE_SECURE_COOKIE === 'true';
  const apiUrl = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); // Clear any existing errors

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });

      if (response.data.status === 'success') {
        setCookie('session', response.data.session, { path: '/', secure: isSecureCookie });
        setCookie('username', username, { path: '/', secure: isSecureCookie });
        navigate('/home');
      } else {
        setErrorMsg(response.data.message);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Handling Axios errors specifically
        if (error.response) {
          const status = error.response.status;
          if (status === 400 || status === 401) {
            const data = error.response.data;
            if (typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
              setErrorMsg(data.message);
            } else {
              setErrorMsg('Authentication failed.');
            }
          } else {
            setErrorMsg('An unexpected error occurred.');
          }
        } else {
          setErrorMsg('A network error occurred.');
        }
      } else if (error instanceof Error) {
        // Handling generic Error instances
        console.error('Error:', error.message);
        setErrorMsg('An unexpected error occurred.');
      } else {
        // Handling unknown errors
        console.error('An unknown error occurred:', error);
        setErrorMsg('An unexpected error occurred.');
      }
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
      {errorMsg && <Typography color="error">{errorMsg}</Typography>}
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
