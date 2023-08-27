import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { Box, CircularProgress } from '@mui/material';

const AuthGuard = ({ children }) => {
  const [cookies] = useCookies(['session']);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('https://automation.charts.cx/session', {
          headers: {
            'Authorization': `Bearer ${cookies.session}`
          }
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    }

    checkSession();
  }, [cookies.session, navigate]);

  if (isAuthenticated === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  } else if (isAuthenticated === true) {
    return children;
  } else {
    return null;  // You can return null or a redirect to the login page or any other placeholder
  }
};

export default AuthGuard;
