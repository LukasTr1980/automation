import { useState, useEffect } from 'react';
import { useUserStore } from './store';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const useCountdown = () => {
  const { tokenExpiry, userLogin, setTokenAndExpiry } = useUserStore();
  const [timeLeft, setTimeLeft] = useState({ value: '', expired: false });
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiryTime = tokenExpiry ? tokenExpiry * 1000 : 0; // Convert to milliseconds
      const difference = expiryTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ value: `${hours}h ${minutes}m ${seconds}s`, expired: false });
      } else if (!timeLeft.expired) {
        // Token has just expired and this block will run only once due to the check
        setTimeLeft({ value: 'Expired', expired: true });
        updateToken();
      }
    };

    const timerId = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [tokenExpiry, timeLeft.expired]); // Dependency on timeLeft.expired ensures updateToken runs once

  const updateToken = async () => {
    try {
      const response = await axios.post(`${apiUrl}/refreshToken`, { username: userLogin });
      if (response.status === 200 && response.data.accessToken) {
        setTokenAndExpiry(response.data.accessToken);
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
