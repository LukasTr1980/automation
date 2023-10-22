//ScheduledTaskCard.jsx
import { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SwitchComponent from './switchComponent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { daysOfWeek, months } from './constants';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import PropTypes from 'prop-types';


export default function ScheduledTaskCard({ zoneName, tasks, customLabels, onDelete, redisKey }) {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const currentMonth = new Date().getMonth();

  const cleanZoneName = zoneName
    .replace(/\s+/g, '_')
    .replace(/ü/g, 'ue');
  const [switchStates, setSwitchStates] = useState({
    [cleanZoneName]: false
  });
  const apiUrl = import.meta.env.VITE_API_URL;

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
          console.log(response.data);
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

  const handleDelete = (taskId) => {
    axios.delete(`${apiUrl}/deleteTask`, { data: { taskId: taskId, zone: redisKey } })
      .then(response => {
        console.log(response.data);
        // Notify parent component to remove the deleted task
        if (onDelete) {
          onDelete(taskId);
        }
        setOpenSnackbar(true);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  }

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

          const isActive = parsedTask.recurrenceRule.month.includes(currentMonth) && switchStates[cleanZoneName];

          const status = customLabels && customLabels[parsedTask.state]
            ? customLabels[parsedTask.state]
            : (parsedTask.state ? "Ein" : "Aus");

          const allDays = parsedTask.recurrenceRule.dayOfWeek.length === 7;
          const days = allDays ? "Täglich" : parsedTask.recurrenceRule.dayOfWeek.map(day => daysOfWeek[day].substring(0, 3)).join(", ");

          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: isActive ? '#DFF0D8' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div>
                  <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                    {status}
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    {`${parsedTask.recurrenceRule.hour.toString().padStart(2, '0')}:${parsedTask.recurrenceRule.minute.toString().padStart(2, '0')}`}
                  </Typography>
                </div>
                {isActive && <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '10px' }}>Aktiv</span>}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <Typography variant="body2" style={{ color: isActive ? 'bold' : 'normal' }}>
                  {days}
                  <br />
                  {parsedTask.recurrenceRule.month.map(month => months[month].substring(0, 3)).join(", ")}
                </Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', minWidth: '50px' }}>
                <IconButton aria-label='delete' onClick={() => handleDelete(task.taskId)}>
                  <DeleteIcon />
                </IconButton>
              </div>
            </div>
          );
        })}
      </CardContent>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success">
          Zeitplan gelöscht!
        </Alert>
      </Snackbar>
    </Card>
  );
}

ScheduledTaskCard.propTypes = {
  zoneName: PropTypes.string.isRequired,
  tasks: PropTypes.array.isRequired,
  customLabels: PropTypes.object,
  onDelete: PropTypes.func,
  redisKey: PropTypes.string,
};