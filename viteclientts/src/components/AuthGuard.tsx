import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { Box, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';
import { AuthGuardProps } from '../types/types';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';

const AuthGuard: React.FC<AuthGuardProps & { requiredRole?: string }> = ({ children, requiredRole }) => {
  const [cookies] = useCookies(['session']);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);
  const navigate = useNavigate();
  const { role } = useUserStore(); // Accessing role from Zustand store
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const [isRoleChecking, setIsRoleChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsRoleChecking(true);

      // Server-side validation
      try {
        const response = await axios.get(`${apiUrl}/session`, {
          headers: {
            'Authorization': `Bearer ${cookies.session}`
          },
          params: { requiredRole }
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setShouldNavigate(true);
        }
        setIsRoleChecking(false);
      } catch (error) {
        setIsAuthenticated(false);
        setShouldNavigate(true);

        let errorMessage = 'An error occurred';
        if (axios.isAxiosError(error) && error.response) {
          if (error.response) {
            const message = error.response.data.message || 'An error occurred';
            const status = error.response.status;
            if (status === 401 || status === 403) {
              showSnackbar(message, 'error');
            }
          } else {
            errorMessage = 'Network Error';
            showSnackbar(errorMessage, 'error');
          }

        }
        setIsRoleChecking(false);
      }
    };

    checkSession();
  }, [cookies.session, apiUrl, role, requiredRole, showSnackbar]);

  useEffect(() => {
    if (shouldNavigate) {
      navigate('/login');
    }
  }, [shouldNavigate, navigate]);

  if (isAuthenticated === null || isRoleChecking) {
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
  requiredRole: PropTypes.string
};

export default AuthGuard;
