// File: useCountdown.js
import { useState, useEffect } from 'react';
import { useUserStore } from './store';

const useCountdown = () => {
  const tokenExpiry = useUserStore(state => state.tokenExpiry);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiryTime = tokenExpiry ? tokenExpiry * 1000 : 0; // Convert to milliseconds
      const difference = expiryTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
      } else {
        return 'Expired';
      }
    };

    const updateTimer = () => setTimeLeft(calculateTimeLeft());
    updateTimer();
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [tokenExpiry]);

  return timeLeft;
};

export default useCountdown;
