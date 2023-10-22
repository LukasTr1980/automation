//SchedulerCard.jsx
import { useState, useContext } from 'react';
import axios from 'axios';
import { bewaesserungsTopics, switchDescriptions, daysOfWeekNumbers, monthsNumbers } from './constants';
import { WeekdaysSelect, MonthsSelect, HourField, MinuteField } from '.';
import SwitchComponent from './switchComponent';
import DialogFullScreen from './DialogFullScreen';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import PropTypes from 'prop-types';
import { SnackbarContext } from './snackbar/SnackbarContext';

const SchedulerCard = ({ setReloadTasks, scheduledTasks, setScheduledTasks, initialTopic, mqttTopics = bewaesserungsTopics, topicDescriptions = switchDescriptions }) => {
  const { showSnackbar } = useContext(SnackbarContext);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || mqttTopics[0]);
  const specialSwitchValues = {
    'markise/switch/haupt': { true: 1, false: 2 }
  };
  const topicLabels = {
    'markise/switch/haupt': { true: "Ausfahren", false: "Einfahren" }
  };
  const [switchState, setSwitchState] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');
  const [weekDaysDialogOpen, setWeekDaysDialogOpen] = useState(false);
  const [monthDialogOpen, setMonthDialogOpen] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  const selectedDayNames = selectedDays.map(num => {
    return Object.keys(daysOfWeekNumbers).find(key => daysOfWeekNumbers[key] === num)
  })

  const selectedMonthNames = selectedMonths.map(num => {
    return Object.keys(monthsNumbers).find(key => monthsNumbers[key] === num)
  })

  const weekDaysButtonText = selectedDayNames.length
    ? selectedDayNames.map(day => day.substring(0, 3)).join(', ')
    : "Wochentage";

  const monthButtonText = selectedMonthNames.length
    ? selectedMonthNames.map(month => month.substring(0, 3)).join(', ')
    : "Monate";

  const currentLabel = topicLabels[selectedTopic]
    ? topicLabels[selectedTopic][switchState]
    : switchState ? "Ein" : "Aus";

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
  };

  const handleSwitchChange = (event) => {
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
        ? specialSwitchValues[selectedTopic][switchState]
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

  return (
    <Card>
      <CardHeader title="Zeiplan erstellen" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="mqtt-topic-label">Zone</InputLabel>
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
            <Button variant="contained"
              color={fieldValidity.day ? (selectedDays.length ? "primary" : "secondary") : "error"}
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
            <Button variant="contained"
              color={fieldValidity.month ? (selectedMonths.length ? "primary" : "secondary") : "error"}
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

SchedulerCard.propTypes = {
  setReloadTasks: PropTypes.func.isRequired, 
  scheduledTasks: PropTypes.any,  
  setScheduledTasks: PropTypes.func.isRequired,  
  initialTopic: PropTypes.string, 
  mqttTopics: PropTypes.array,
  topicDescriptions: PropTypes.array,
};

export default SchedulerCard;
