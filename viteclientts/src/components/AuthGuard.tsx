import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { AuthGuardProps, ErrorResponse } from '../types/types';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';
import { useStableTranslation } from '../utils/useStableTranslation';
import LoadingSpinner from './LoadingSpinner';

const AuthGuard: React.FC<AuthGuardProps & { requiredRole?: string }> = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);
  const navigate = useNavigate();
  const { jwtToken, role, setJwtToken, userLogin, setTokenExpiry } = useUserStore();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const showSnackbarRef = useRef(showSnackbar);
  const stableTranslate = useStableTranslation();

  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin, role });

      if (response.status === 200 && response.data.accessToken) {
        setJwtToken(response.data.accessToken);
        setTokenExpiry(response.data.expiresAt);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;

      const backendMessageKey = axiosError.response?.data.message || 'unexpectedErrorOccurred';
      const backendMessageSeverity = axiosError.response?.data.severity || 'error';

      showSnackbarRef.current(stableTranslate ? stableTranslate(backendMessageKey) : backendMessageKey, backendMessageSeverity);
      setIsAuthenticated(false);
      setShouldNavigate(true);
      return false;
    }
  }, [apiUrl, setJwtToken, userLogin, role, stableTranslate, setTokenExpiry]);


  useEffect(() => {
    if (!jwtToken) {
      refreshToken();
    }
  }, [jwtToken, refreshToken]);

  useEffect(() => {
    if (jwtToken && (requiredRole && role !== requiredRole)) {
      setIsAuthenticated(false);
      setShouldNavigate(true);
      showSnackbarRef.current(stableTranslate('forbiddenYouDontHavePermission'), 'warning');
    } else if (jwtToken) {
      setIsAuthenticated(true);
    }
  }, [jwtToken, role, requiredRole, stableTranslate, showSnackbar]);

  useEffect(() => {
    if (shouldNavigate) {
      navigate('/login');
    }
  }, [shouldNavigate, navigate]);

  useEffect(() => {
    showSnackbarRef.current = showSnackbar;
  }, [showSnackbar]);

  if (isAuthenticated === null) {
    return (
      <LoadingSpinner />
    );
  } else if (isAuthenticated) {
    return children;
  } else {
    return null;
  }
};

export default AuthGuard;
