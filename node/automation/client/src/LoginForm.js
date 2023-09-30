import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom'; // import useNavigate

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cookies, setCookie] = useCookies(['session']);
  const navigate = useNavigate(); // define navigate
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });

      if (response.data.status === 'success') {
        setCookie('session', response.data.session, { path: '/' });
        setCookie('username', username, { path: '/' });
        navigate('/home'); // add this line to navigate to the home page
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert('Wrong username or password.');
      } else {
        console.error('Error:', error);
        alert('An error occurred while trying to log in.');
      }
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '300px',
        margin: '0 auto',
        p: 2,
        backgroundColor: '#f5f5f5',
        gap: 2,
      }}
      noValidate
      autoComplete="off"
    >
      <Typography variant="h5" color="black">Login Villa Anna Automation</Typography>
      <TextField
        label="Username"
        variant="outlined"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        InputLabelProps={{
          shrink: true,
          style: { color: "#757575", transition: "none" },
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
          style: { color: "#757575", transition: "none" },
        }}
      />
      <Button
        variant="contained"
        color="primary"
        type="submit"
      >
        Login
      </Button>
    </Box>
  );
};

export default LoginForm;
