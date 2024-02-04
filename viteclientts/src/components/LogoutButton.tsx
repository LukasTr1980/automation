import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import { ExitToApp } from '@mui/icons-material';
import { useUserStore } from '../utils/store';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const { setUserLogin, clearJwtToken, setPreviousLastLogin, setHasVisitedBefore } = useUserStore();
  const apiUrl = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    try {
      await axios.post(`${apiUrl}/logout`, {});
      setUserLogin(null);
      clearJwtToken();
      setPreviousLastLogin(null);
      setHasVisitedBefore(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <IconButton edge='end' onClick={handleLogout} sx={{ color: 'white' }}>
      <ExitToApp />
    </IconButton>
  );
};

export default LogoutButton;
