import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { Box, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [cookies] = useCookies(['session']);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${apiUrl}/session`, {
          headers: {
            'Authorization': `Bearer ${cookies.session}`
          }
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setShouldNavigate(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setShouldNavigate(true);
      }
    };

    checkSession();
  }, [cookies.session, apiUrl]);

  useEffect(() => {
    if (shouldNavigate) {
      navigate('/login');
    }
  }, [shouldNavigate, navigate]);

  if (isAuthenticated === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  } else if (isAuthenticated === true) {
    return children;
  } else {
    return null;
  }
};

AuthGuard.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthGuard;
