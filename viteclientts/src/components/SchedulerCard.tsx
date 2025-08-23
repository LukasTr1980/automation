import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { bewaesserungsTopicsSet, switchDescriptions, useDaysOfWeekNumbers, useMonthsNumbers } from './constants';
import { WeekdaysSelect, MonthsSelect, HourField, MinuteField, ZoneSelector } from '.';
import SwitchComponent from './switchComponent';
import DialogFullScreen from './DialogFullScreen';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControlLabel,
  Button,
} from '@mui/material';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CircularProgress from '@mui/material/CircularProgress';
import useSnackbar from '../utils/useSnackbar';
import { SchedulerCardProps } from '../types/types';
import { messages } from '../utils/messages';
import { useQueryClient } from '@tanstack/react-query';

const SchedulerCard: React.FC<SchedulerCardProps> = ({
  initialTopic,
  mqttTopics = bewaesserungsTopicsSet,
  topicDescriptions = switchDescriptions,
  taskToCopy,
}) => {
  const queryClient = useQueryClient();
  const daysOfWeekNumbers = useDaysOfWeekNumbers();
  const monthsNumbers = useMonthsNumbers();
  const { showSnackbar } = useSnackbar();
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || mqttTopics[0]);
  const [switchState, setSwitchState] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');
  const [weekDaysDialogOpen, setWeekDaysDialogOpen] = useState<boolean>(false);
  const [monthDialogOpen, setMonthDialogOpen] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  const selectedDayNames = selectedDays
    .map(num => Object.keys(daysOfWeekNumbers).find(key => daysOfWeekNumbers[key] === num))
    .filter(Boolean) as string[];

  const selectedMonthNames = selectedMonths
    .map(num => Object.keys(monthsNumbers).find(key => monthsNumbers[key] === num))
    .filter(Boolean) as string[];

  const weekDaysButtonText = selectedDayNames.length
    ? selectedDayNames.map(day => day.substring(0, 3)).join(', ')
    : 'Wochentage';

  const monthButtonText = selectedMonthNames.length
    ? selectedMonthNames.map(month => month.substring(0, 3)).join(', ')
    : 'Monate';

  // The label now only depends on the switch state. "Ein" / "Aus" are used as fallbacks.
  const currentLabel = switchState ? 'Ein' : 'Aus';

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleSwitchChange = (event: React.ChangeEvent<{ checked: boolean }>) => {
    setSwitchState(event.target.checked);
  };

  const [fieldValidity, setFieldValidity] = useState({
    month: true,
    day: true,
    hour: true,
    minute: true,
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
      const stateValue = switchState;

      setScheduling(true);
      axios
        .post(`${apiUrl}/scheduler`, {
          hour: selectedHour,
          minute: selectedMinute,
          topic: selectedTopic,
          state: stateValue,
          days: selectedDays,
          months: selectedMonths,
        })
        .then(response => {
          const backendMessageKey = response.data;
          const translatedMessage = messages[backendMessageKey] || backendMessageKey;
          // Reset form and inform parent via query invalidation
          setSelectedHour('');
          setSelectedMinute('');
          setSelectedDays([]);
          setSelectedMonths([]);
          setSelectedTopic(mqttTopics[0]);
          setSwitchState(false);
          queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
          showSnackbar(translatedMessage);
        })
        .catch(error => console.error('Error:', error))
        .finally(() => setScheduling(false));
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
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={'Zeitplan erstellen'}
        slotProps={{ title: { sx: { fontWeight: 600 } } }}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={12}>
            <ZoneSelector value={selectedTopic} onChange={handleTopicChange} labels={topicDescriptions} values={mqttTopics} ariaLabel="Zone" />
          </Grid>

          <Grid size={12}>
            <FormControlLabel
              control={<SwitchComponent id="scheduler-switch" name="scheduler-switch" checked={switchState} handleToggle={handleSwitchChange} label={currentLabel} />}
              label=""
            />
          </Grid>

          <Grid size={6}>
            <HourField selectedHour={selectedHour} setSelectedHour={setSelectedHour} error={!fieldValidity.hour} />
          </Grid>
          <Grid size={6}>
            <MinuteField selectedMinute={selectedMinute} setSelectedMinute={setSelectedMinute} error={!fieldValidity.minute} />
          </Grid>

          <Grid size={12}>
            <Button
              variant="outlined"
              color={!fieldValidity.day ? 'error' : 'primary'}
              fullWidth
              type="button"
              onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setTimeout(() => setWeekDaysDialogOpen(true), 0); }}
              aria-haspopup="dialog"
              aria-controls="weekdays-dialog"
              aria-pressed={selectedDays.length ? 'true' : 'false'}
              startIcon={<CalendarViewWeekIcon />}
              disableElevation
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              {weekDaysButtonText}
            </Button>
            <DialogFullScreen id="weekdays-dialog" open={weekDaysDialogOpen} onClose={() => setWeekDaysDialogOpen(false)} title={'Auswählen'}>
              <Grid size={12}>
                <WeekdaysSelect selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
              </Grid>
            </DialogFullScreen>
          </Grid>

          <Grid size={12}>
            <Button
              variant="outlined"
              color={!fieldValidity.month ? 'error' : 'primary'}
              fullWidth
              type="button"
              onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setTimeout(() => setMonthDialogOpen(true), 0); }}
              aria-haspopup="dialog"
              aria-controls="months-dialog"
              aria-pressed={selectedMonths.length ? 'true' : 'false'}
              startIcon={<CalendarMonthIcon />}
              disableElevation
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              {monthButtonText}
            </Button>
            <DialogFullScreen id="months-dialog" open={monthDialogOpen} onClose={() => setMonthDialogOpen(false)} title={'Auswählen'}>
              <Grid size={12}>
                <MonthsSelect selectedMonths={selectedMonths} setSelectedMonths={setSelectedMonths} />
              </Grid>
            </DialogFullScreen>
          </Grid>

          <Grid size={12}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSchedule}
              disableElevation
              disabled={scheduling}
              aria-busy={scheduling ? 'true' : 'false'}
              startIcon={scheduling ? <CircularProgress size={18} color='inherit' /> : <ScheduleIcon />}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Planen
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SchedulerCard;
