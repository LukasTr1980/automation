import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthGuardProps } from '../types/types';
import { useUserStore } from '../utils/store';
import LoadingSpinner from './LoadingSpinner';
import useSnackbar from '../utils/useSnackbar';
import { useStableTranslation } from '../utils/useStableTranslation';

const AuthGuard: React.FC<AuthGuardProps & { requiredRole?: string }> = ({ children, requiredRole }) => {
  const [isChecking, setIsChecking] = useState(true); // State to manage loading status
  const navigate = useNavigate();
  const { jwtToken, setJwtToken, userLogin, setTokenExpiry } = useUserStore();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const stableTranslate = useStableTranslation();

  useEffect(() => {
    const verifyAuthentication = async () => {
      if (!jwtToken) {
        // Attempt to refresh the token if not present
        try {
          const refreshTokenResponse = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin });
          if (refreshTokenResponse.status === 200 && refreshTokenResponse.data.accessToken) {
            setJwtToken(refreshTokenResponse.data.accessToken);
            setTokenExpiry(refreshTokenResponse.data.expiresAt);
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (error) {
          showSnackbar(stableTranslate('invalidOrExpiredToken'), 'warning');
          navigate('/login');
          return;
        }
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
  }, [apiUrl, jwtToken, navigate, requiredRole, setJwtToken, setTokenExpiry, userLogin, stableTranslate, showSnackbar]);

  if (isChecking) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};

export default AuthGuard;
