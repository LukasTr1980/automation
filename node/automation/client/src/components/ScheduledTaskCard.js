import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SwitchComponent from './switchComponent';
import Typography from '@mui/material/Typography';
import { daysOfWeek, months } from './constants';
import axios from 'axios';

export default function ScheduledTaskCard({ zoneName, tasks, customLabels }) {
  const cleanZoneName = zoneName
                          .replace(/\s+/g, '_')
                          .replace(/ü/g, 'ue');
  const [switchStates, setSwitchStates] = useState({
    [cleanZoneName]: false
  });
  const apiUrl = process.env.REACT_APP_API_URL;

  // Handler function for switch toggle
  const handleToggle = (zone) => () => {
    setSwitchStates(prevState => {
      const updatedState = {
        ...prevState,
        [zone]: !prevState[zone]
      };

      // Send updated switch state to the backend
      axios.post(`${apiUrl}/switchTaskEnabler`, { zone: cleanZoneName, state: updatedState[zone] })
        .then(response => {
          // Handle response if needed
        })
        .catch(error => {
          console.error('Error:', error);
        });

      return updatedState;
    });
  };

  // useEffect hook to fetch the initial switch state from the backend
  useEffect(() => {
    // Define a function to fetch the initial switch state from the backend
    const fetchInitialState = async () => {
      try {
        const response = await axios.get(`${apiUrl}/getTaskEnabler?zone=${cleanZoneName}`);
        setSwitchStates(prevState => ({ ...prevState, [cleanZoneName]: response.data.state === true }));
      } catch (error) {
        console.error('Error:', error);
      }
    };

    // Call the function
    fetchInitialState();
  }, [cleanZoneName, apiUrl]); // Dependency array: only re-run if cleanZoneName changes

  return (
    <Card style={{ margin: "10px", border: "1px solid black" }}>
      <CardContent style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {zoneName}
          </Typography>
          <SwitchComponent checked={switchStates[cleanZoneName]} handleToggle={handleToggle(cleanZoneName)} />
        </div>

        {tasks.map((task, i) => {
          const parsedTask = task;

          const status = customLabels && customLabels[parsedTask.state]
            ? customLabels[parsedTask.state]
            : (parsedTask.state ? "Ein" : "Aus");

          const allDays = parsedTask.recurrenceRule.dayOfWeek.length === 7;
          const days = allDays ? "Täglich" : parsedTask.recurrenceRule.dayOfWeek.map(day => daysOfWeek[day]).join(", ");

          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                  {status}
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  {`${parsedTask.recurrenceRule.hour.toString().padStart(2, '0')}:${parsedTask.recurrenceRule.minute.toString().padStart(2, '0')}`}
                </Typography>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Typography variant="body2">
                  {days}
                  <br />
                  {parsedTask.recurrenceRule.month.map(month => months[month].substring(0, 3)).join(", ")}
                </Typography>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
