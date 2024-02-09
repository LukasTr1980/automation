import { useState, useEffect } from 'react';
import { useUserStore } from './store';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const useCountdown = () => {
  const { tokenExpiry, userLogin, setTokenAndExpiry, deviceId } = useUserStore();
  const [timeLeft, setTimeLeft] = useState({ value: '', refreshing: false });
  const [attemptRefresh, setAttemptRefresh] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiryTime = tokenExpiry ? tokenExpiry * 1000 : 0;
      const difference = expiryTime - now;

      if (difference > 10000) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ value: `${hours}h ${minutes}m ${seconds}s`, refreshing: false });
      } else if (!attemptRefresh) {
        setAttemptRefresh(true);
        setTimeLeft(timeLeft => ({ ...timeLeft, value: t('refreshingToken'), refreshing: true }));
        updateToken();
      }
    };

    if (!attemptRefresh) {
      const timerId = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timerId);
    }
  }, [tokenExpiry, attemptRefresh, t]);

  const updateToken = async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin, deviceId });
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
        setAttemptRefresh(false); 
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      navigate('/login');
    }
  };

  return timeLeft;
};

export default useCountdown;
