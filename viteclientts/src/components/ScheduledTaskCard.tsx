import { useState, useEffect, Fragment } from 'react';
import SwitchComponent from './switchComponent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, Chip, Divider, Stack } from '@mui/material';
import { useDaysOfWeek, useMonths } from './constants';
import axios from 'axios';
import useSnackbar from '../utils/useSnackbar';
import { ScheduledTask, ScheduledTaskCardProps } from '../types/types';
import { messages } from '../utils/messages';

export default function ScheduledTaskCard({ zoneName, tasks, customLabels, onDelete, redisKey, onCopyTask }: ScheduledTaskCardProps) {
  const daysOfWeek = useDaysOfWeek();
  const monthLabels = useMonths();
  const { showSnackbar } = useSnackbar();
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
        const backendMessageKey = response.data;
        const translatedMessage = messages[backendMessageKey] || backendMessageKey;
        showSnackbar(translatedMessage);
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
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>{zoneName}</Typography>
        <SwitchComponent
          checked={switchStates[cleanZoneName]}
          handleToggle={handleToggle(cleanZoneName)}
          label={switchStates[cleanZoneName] ? 'Aktiv' : 'Inaktiv'}
        />
      </Box>

      {sortedGroupKeys.map((key) => (
        <Box key={key} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1, mb: 1.5 }}>
          {groupedTasksForDisplay[key].map((task, i) => {
            const months = task.recurrenceRule?.month ?? [];
            const isInSeasonMonth = months.length === 0 || months.includes(currentMonth);
            const isActive = isInSeasonMonth && switchStates[cleanZoneName];
            const status = customLabels && customLabels[task.state.toString()] ? customLabels[task.state.toString()] : (task.state ? 'Ein' : 'Aus');
            const allDays = task.recurrenceRule.dayOfWeek.length === 7;
            const days = allDays ? 'Täglich' : task.recurrenceRule.dayOfWeek.map((day) => daysOfWeek[day].substring(0, 3)).join(', ');
            const timeLabel = `${task.recurrenceRule.hour.toString().padStart(2, '0')}:${task.recurrenceRule.minute.toString().padStart(2, '0')}`;

            return (
              <Fragment key={i}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' }
                }}
              >
                {/* Left: status dot + status label + time */}
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 0, sm: 160 } }}>
                  <Box
                    component="span"
                    aria-hidden
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      mr: 1,
                      bgcolor: task.state && isInSeasonMonth ? 'success.main' : 'text.disabled',
                    }}
                  />
                  <Typography variant="body2" sx={{ mr: 1 }}>{status}</Typography>
                  <Typography variant="body2" color="text.secondary">{timeLabel}</Typography>
                </Box>

                {/* Middle: day and month chips */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 auto' },
                    flexWrap: 'wrap',
                    order: { xs: 3, sm: 2 },
                    mt: { xs: 0.5, sm: 0 },
                    minWidth: 0
                  }}
                  aria-label="Wiederholung"
                >
                  <Chip size="small" variant="outlined" label={days} />
                  {task.recurrenceRule.month.map((m) => (
                    <Chip key={m} size="small" variant="outlined" label={monthLabels[m].substring(0, 3)} />
                  ))}
                </Stack>

                {/* Right: active hint + actions */}
                <Stack
                  direction="row"
                  spacing={0}
                  alignItems="center"
                  sx={{ ml: 'auto', flexShrink: 0, order: { xs: 2, sm: 3 } }}
                >
                  {isActive && (
                    <Chip size="small" color="success" label="Aktiv" sx={{ mr: 0.5 }} />
                  )}
                  <IconButton aria-label='Zeitplan kopieren' onClick={() => handleCopy(task)}>
                    <ContentCopyIcon />
                  </IconButton>
                  <IconButton aria-label='Zeitplan löschen' onClick={() => handleDelete(task.taskId)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Box>
              {i < groupedTasksForDisplay[key].length - 1 && <Divider sx={{ my: 1 }} />}
              </Fragment>
            );
          })}
        </Box>
      ))}
    </>
  );
}
