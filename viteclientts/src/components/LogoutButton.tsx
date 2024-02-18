import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import { ExitToApp } from '@mui/icons-material';
import { useUserStore } from '../utils/store';
import useSnackbar from '../utils/useSnackbar';
import { useTranslation } from 'react-i18next';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const { setUserLogin, clearJwtToken, setHasVisitedBefore, setLogoutInProgress, setDeviceId } = useUserStore();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { showSnackbar } = useSnackbar();
  const { t } = useTranslation();

  const handleLogout = async () => {
    setLogoutInProgress(true);
    try {
      await axios.post(`${apiUrl}/logout`, {});
      setUserLogin(null);
      clearJwtToken();
      setHasVisitedBefore(null);
      setDeviceId(null);
      navigate('/login');
      showSnackbar(t('loggedOut'));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <IconButton edge='end' onClick={handleLogout} sx={{ color: '#1565C0', '&:hover': { backgroundColor: '#D2E9F0' } }}>
      <ExitToApp />
    </IconButton>
  );
};

export default LogoutButton;
