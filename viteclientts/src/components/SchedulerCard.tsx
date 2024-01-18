// SchedulerCard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { bewaesserungsTopicsSet, switchDescriptions, daysOfWeekNumbers, monthsNumbers } from './constants';
import { WeekdaysSelect, MonthsSelect, HourField, MinuteField } from '.';
import SwitchComponent from './switchComponent';
import DialogFullScreen from './DialogFullScreen';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Button,
} from '@mui/material';
import useSnackbar from '../utils/useSnackbar';
import { SchedulerCardProps } from '../types/types';

const SchedulerCard: React.FC<SchedulerCardProps> = ({
  setReloadTasks,
  setScheduledTasks,
  initialTopic,
  mqttTopics = bewaesserungsTopicsSet,
  topicDescriptions = switchDescriptions,
  taskToCopy,
}) => {
  const { showSnackbar } = useSnackbar();
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || mqttTopics[0]);
  const specialSwitchValues: Record<string, Record<string, number>> = {
    'markise/switch/haupt/set': { 'true': 1, 'false': 2 }
  };

  const topicLabels: Record<string, Record<string, string>> = {
    'markise/switch/haupt/set': { 'true': "Ausfahren", 'false': "Einfahren" }
  };
  const [switchState, setSwitchState] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');
  const [weekDaysDialogOpen, setWeekDaysDialogOpen] = useState<boolean>(false);
  const [monthDialogOpen, setMonthDialogOpen] = useState<boolean>(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  const selectedDayNames = selectedDays
    .map(num => Object.keys(daysOfWeekNumbers).find(key => daysOfWeekNumbers[key] === num))
    .filter(Boolean) as string[];

  const selectedMonthNames = selectedMonths
    .map(num => Object.keys(monthsNumbers).find(key => monthsNumbers[key] === num))
    .filter(Boolean) as string[];

  const weekDaysButtonText = selectedDayNames.length
    ? selectedDayNames.map(day => day.substring(0, 3)).join(', ')
    : "Wochentage";

  const monthButtonText = selectedMonthNames.length
    ? selectedMonthNames.map(month => month.substring(0, 3)).join(', ')
    : "Monate";

  const currentLabel = topicLabels[selectedTopic]
    ? topicLabels[selectedTopic][String(switchState)]
    : switchState ? "Ein" : "Aus";

  const handleTopicChange = (event: SelectChangeEvent<string>) => {
    setSelectedTopic(event.target.value as string);
  };

  const handleSwitchChange = (event: React.ChangeEvent<{ checked: boolean }>) => {
    setSwitchState(event.target.checked);
  };

  const [fieldValidity, setFieldValidity] = useState({
    month: true,
    day: true,
    hour: true,
    minute: true
  });

  const handleSchedule = () => {
    const isValid = {
      month: selectedMonths.length > 0,
      day: selectedDays.length > 0,
      hour: selectedHour !== '',
      minute: selectedMinute !== '',
    };

    setFieldValidity(isValid);

    if (Object.values(isValid).every(Boolean)) {
      const stateValue = specialSwitchValues[selectedTopic]
        ? specialSwitchValues[selectedTopic][String(switchState)]
        : switchState;

      axios.post(`${apiUrl}/scheduler`, {
        hour: selectedHour,
        minute: selectedMinute,
        topic: selectedTopic,
        state: stateValue,
        days: selectedDays,
        months: selectedMonths
      })
        .then(response => {
          const successMessage = response.data;
          console.log(successMessage);
          axios.get(`${apiUrl}/scheduledTasks`)
            .then(response => {
              setScheduledTasks(response.data);
              setSelectedHour('');
              setSelectedMinute('');
              setSelectedDays([]);
              setSelectedMonths([]);
              setSelectedTopic(mqttTopics[0]);
              setSwitchState(false);
              setReloadTasks(prevState => !prevState);
              showSnackbar(successMessage);
            })
            .catch(error => console.error('Error:', error));
        })
        .catch(error => console.error('Error:', error));
    }
  };

  useEffect(() => {
    if (taskToCopy) {
      setSelectedTopic(taskToCopy.topic);

      let booleanState;
      if (typeof taskToCopy.state === 'number') {
        booleanState = taskToCopy.state === 1;
      } else {
        booleanState = taskToCopy.state;
      }

      setSwitchState(booleanState);

      setSelectedDays(taskToCopy.recurrenceRule.dayOfWeek);
      setSelectedMonths(taskToCopy.recurrenceRule.month);
      setSelectedHour(taskToCopy.recurrenceRule.hour.toString());
      setSelectedMinute(taskToCopy.recurrenceRule.minute.toString());
    }
  }, [taskToCopy]);

  return (
    <Card variant='outlined'>
      <CardHeader title="Zeitplan erstellen" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="mqtt-topic-label" shrink={false}>Zone</InputLabel>
              <Select
                labelId="mqtt-topic-label"
                value={selectedTopic}
                onChange={handleTopicChange}
              >
                {mqttTopics.map((topic, i) => (
                  <MenuItem value={topic} key={i}>
                    {topicDescriptions[i] || topic}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <SwitchComponent
                  checked={switchState}
                  handleToggle={handleSwitchChange}
                  label={currentLabel}
                />
              }
              label="" // Since the label is handled inside the custom component, we leave it empty here.
            />
          </Grid>
          <Grid item xs={6}>
            <HourField selectedHour={selectedHour} setSelectedHour={setSelectedHour} error={!fieldValidity.hour} />
          </Grid>
          <Grid item xs={6}>
            <MinuteField selectedMinute={selectedMinute} setSelectedMinute={setSelectedMinute} error={!fieldValidity.minute} />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color={!fieldValidity.day ? "error" : "primary"}
              fullWidth
              onClick={() => setWeekDaysDialogOpen(true)}
              aria-pressed={selectedDays.length ? 'true' : 'false'}
            >
              {weekDaysButtonText}
            </Button>
            <DialogFullScreen open={weekDaysDialogOpen} onClose={() => setWeekDaysDialogOpen(false)}>
              <Grid item xs={12}>
                <WeekdaysSelect selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
              </Grid>
            </DialogFullScreen>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color={!fieldValidity.day ? "error" : "primary"}
              fullWidth
              onClick={() => setMonthDialogOpen(true)}
              aria-pressed={selectedMonths.length ? 'true' : 'false'}
            >
              {monthButtonText}
            </Button>
            <DialogFullScreen open={monthDialogOpen} onClose={() => setMonthDialogOpen(false)}>
              <Grid item xs={12}>
                <MonthsSelect selectedMonths={selectedMonths} setSelectedMonths={setSelectedMonths} />
              </Grid>
            </DialogFullScreen>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth onClick={handleSchedule}>
              Planen
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SchedulerCard;
