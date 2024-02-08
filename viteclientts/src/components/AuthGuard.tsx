import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthGuardProps } from '../types/types';
import { useUserStore } from '../utils/store';
import LoadingSpinner from './LoadingSpinner';
import useSnackbar from '../utils/useSnackbar';
import { useStableTranslation } from '../utils/useStableTranslation';

const AuthGuard: React.FC<AuthGuardProps & { requiredRole?: string }> = ({ children, requiredRole }) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { jwtToken, userLogin, logoutInProgress, setTokenAndExpiry } = useUserStore();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const stableTranslate = useStableTranslation();

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin });
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
        return true;
      }
    } catch (error) {
      showSnackbar(stableTranslate('invalidOrExpiredToken'), 'warning');
      navigate('/login');
    }
    return false;
  };

  useEffect(() => {
    const verifyAuthentication = async () => {
      if (logoutInProgress) {
        return;
      }

      if (jwtToken) {
        try {
          const verifyResponse = await axios.post(`${apiUrl}/verifyToken`, { requiredRole });
          if (verifyResponse.status === 200) {
            setIsChecking(false);
            return;
          }
        } catch (error) {
          const refreshed = await refreshToken();
          if (!refreshed) return;
        }
      } else {
        const refreshed = await refreshToken();
        if (!refreshed) return;
      }

      try {
        const verifyResponse = await axios.post(`${apiUrl}/verifyToken`, { requiredRole });
        if (verifyResponse.status === 200) {
          setIsChecking(false);
        } else {
          throw new Error('Unauthorized');
        }
      } catch (error) {
        showSnackbar(stableTranslate('forbiddenYouDontHavePermission'), 'warning');
        navigate('/login');
      }
    };

    verifyAuthentication();
  }, [apiUrl, jwtToken, navigate, requiredRole, userLogin, stableTranslate, showSnackbar, logoutInProgress, setTokenAndExpiry]);

  if (isChecking) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};

export default AuthGuard;
