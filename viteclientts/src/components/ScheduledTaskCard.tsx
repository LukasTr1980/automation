import { useState, useEffect, useContext } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SwitchComponent from './switchComponent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { daysOfWeek, months } from './constants';
import axios from 'axios';
import { SnackbarContext } from './snackbar/SnackbarContext';
import { ScheduledTask, ScheduledTaskCardProps } from '../types/types';

export default function ScheduledTaskCard({ zoneName, tasks, customLabels, onDelete, redisKey, onCopyTask }: ScheduledTaskCardProps) {
  const snackbackContext = useContext(SnackbarContext);

  if (!snackbackContext) {
    throw new Error('ScheduledTaskCard must be used within a SnackbarProvider');
  }

  const { showSnackbar } = snackbackContext;
  const currentMonth = new Date().getMonth();

  const cleanZoneName = zoneName
    .replace(/\s+/g, '_')
    .replace(/ü/g, 'ue');
  const [switchStates, setSwitchStates] = useState<{ [key: string]: boolean }>({
    [cleanZoneName]: false
  });
  const apiUrl = import.meta.env.VITE_API_URL;

  const handleToggle = (zone: string) => () => {
    setSwitchStates(prevState => {
      const updatedState = {
        ...prevState,
        [zone]: !prevState[zone]
      };

      axios.post(`${apiUrl}/switchTaskEnabler`, { zone: cleanZoneName, state: updatedState[zone] })
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.error('Error:', error);
        });

      return updatedState;
    });
  };

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await axios.get(`${apiUrl}/getTaskEnabler?zone=${cleanZoneName}`);
        setSwitchStates(prevState => ({ ...prevState, [cleanZoneName]: response.data.state === true }));
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchInitialState();
  }, [cleanZoneName, apiUrl]);

  const handleDelete = (taskId: string) => {
    axios.delete(`${apiUrl}/deleteTask`, { data: { taskId: taskId, zone: redisKey } })
      .then(response => {
        console.log(response.data);
        if (onDelete) {
          onDelete(taskId);
        }
        showSnackbar(response.data);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  const handleCopy = (task: ScheduledTask) => {
    onCopyTask(task);
    showSnackbar("Zeitplan kopiert");
  };

  const groupKey = (task: ScheduledTask) => {
    const dayKey = task.recurrenceRule.dayOfWeek.sort().join('-');
    const monthKey = task.recurrenceRule.month.sort().join('-');
    return `${dayKey}_${monthKey}`;
  };

  const groupedTasksForDisplay: { [key: string]: ScheduledTask[] } = tasks.reduce((grouped: { [key: string]: ScheduledTask[] }, task) => {
    const key = groupKey(task);
    grouped[key] = grouped[key] || [];
    grouped[key].push(task);
    return grouped;
  }, {} as { [key: string]: ScheduledTask[] });

  const sortedGroupKeys = Object.keys(groupedTasksForDisplay).sort((a, b) => {
    const getEarliestMonth = (groupKey: string): number => {
      const tasksInGroup = groupedTasksForDisplay[groupKey];
      const months = tasksInGroup.flatMap(task => task.recurrenceRule.month);
      return Math.min(...months);
    };

    return getEarliestMonth(a) - getEarliestMonth(b);
  });

  return (
    <Card style={{ margin: "10px", border: "1px solid black" }}>
      <CardContent style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">{zoneName}</Typography>
          <SwitchComponent checked={switchStates[cleanZoneName]} handleToggle={handleToggle(cleanZoneName)} />
        </div>

        {
          // Iterate over the sorted group keys
          sortedGroupKeys.map(key => (
            <div key={key} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '5px' }}>
              {groupedTasksForDisplay[key].map((task, i) => {
                const isActive = task.recurrenceRule.month.includes(currentMonth) && switchStates[cleanZoneName];
                const status = customLabels && customLabels[task.state.toString()] ? customLabels[task.state.toString()] : (task.state ? "Ein" : "Aus");
                const allDays = task.recurrenceRule.dayOfWeek.length === 7;
                const days = allDays ? "Täglich" : task.recurrenceRule.dayOfWeek.map(day => daysOfWeek[day].substring(0, 3)).join(", ");

                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: isActive ? '#DFF0D8' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>{status}</Typography>
                        <Typography sx={{ mb: 1.5 }} color="text.secondary">
                          {`${task.recurrenceRule.hour.toString().padStart(2, '0')}:${task.recurrenceRule.minute.toString().padStart(2, '0')}`}
                        </Typography>
                      </div>
                      {isActive && <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '10px' }}>Aktiv</span>}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <Typography variant="body2" style={{ color: isActive ? 'bold' : 'normal' }}>
                        {days}
                        <br />
                        {task.recurrenceRule.month.map(month => months[month].substring(0, 3)).join(", ")}
                      </Typography>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '50px' }}>
                      <IconButton aria-label='copy' onClick={() => handleCopy(task)}>
                        <ContentCopyIcon />
                      </IconButton>
                      <IconButton aria-label='delete' onClick={() => handleDelete(task.taskId)}>
                        <DeleteIcon />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        }
      </CardContent>
    </Card>
  );
}