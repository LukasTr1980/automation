import React, { useState, useEffect } from 'react';

const TimeDisplay: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);  // Updates every second

    return () => clearInterval(intervalId);
  }, []);

  // Function to format date and time
  const formatDateTime = (date: Date) => {
    const dayOfWeek = date.toLocaleString('de-DE', { weekday: 'short' }); // German formatting for day
    const day = date.getDate();
    const month = date.toLocaleString('de-DE', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = `${dayOfWeek}, ${day}. ${month} ${year}, ${time}`;
    return formattedDate;
  };

  return (
    <div style={{ color: 'white' }}>
      {formatDateTime(currentDateTime)}
    </div>
  );
};

export default TimeDisplay;
