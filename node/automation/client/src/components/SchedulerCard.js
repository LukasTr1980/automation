import React, { useState } from 'react';
import axios from 'axios';
import { bewaesserungsTopics, switchDescriptions } from './constants';
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

const SchedulerCard = ({ setReloadTasks, scheduledTasks, setScheduledTasks, initialTopic, mqttTopics = bewaesserungsTopics, topicDescriptions = switchDescriptions }) => {
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
  const apiUrl = process.env.REACT_APP_API_URL;

  const currentLabel = topicLabels[selectedTopic]
    ? topicLabels[selectedTopic][switchState]
    : switchState ? "Ein" : "Aus";

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
  };

  const handleSwitchChange = (event) => {
    setSwitchState(event.target.checked);
  };

  const handleSchedule = () => {
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
          })
          .catch(error => console.error('Error:', error));
      })
      .catch(error => console.error('Error:', error));
  };

  return (
    <Card>
      <CardHeader title="Tasks erstellen" />
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
            <HourField selectedHour={selectedHour} setSelectedHour={setSelectedHour} />
          </Grid>
          <Grid item xs={6}>
            <MinuteField selectedMinute={selectedMinute} setSelectedMinute={setSelectedMinute} />
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" color="secondary" fullWidth onClick={() => setWeekDaysDialogOpen(true)}>
              Wochentage
            </Button>
            <DialogFullScreen open={weekDaysDialogOpen} onClose={() => setWeekDaysDialogOpen(false)}>
              <Grid item xs={12}>
                <WeekdaysSelect selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
              </Grid>
            </DialogFullScreen>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="secondary" fullWidth onClick={() => setMonthDialogOpen(true)}>
              Monate
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
