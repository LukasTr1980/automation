import { Checkbox, FormControl, FormControlLabel, FormGroup } from '@mui/material';
import { useDaysOfWeek, useDaysOfWeekNumbers } from './constants';
import React from 'react';
import { WeekdaysSelectProps } from '../types/types';

const WeekdaysSelect: React.FC<WeekdaysSelectProps> = ({ selectedDays, setSelectedDays }) => {
  const daysOfWeek = useDaysOfWeek();
  const daysOfWeekNumbers = useDaysOfWeekNumbers();
  const allDays = ['Täglich', ...daysOfWeek]; // 'Täglich' is now the first item

  const handleDaySelect = (day: string) => {
    if (day === 'Täglich') {
      if (selectedDays.length === daysOfWeek.length) {
        setSelectedDays([]);
      } else {
        setSelectedDays(daysOfWeek.map(day => daysOfWeekNumbers[day]).sort((a, b) => a - b));
      }
    } else {
      const dayNumber = daysOfWeekNumbers[day];
      if (selectedDays.includes(dayNumber)) {
        setSelectedDays(selectedDays.filter((d) => d !== dayNumber).sort((a, b) => a - b));
      } else {
        setSelectedDays([...selectedDays, dayNumber].sort((a, b) => a - b));
      }
    }
  };

  return (
    <FormControl component="fieldset">
      <FormGroup>
        {allDays.map((day, index) => (
          <FormControlLabel
            key={`${day}-${index}`}
            control={
              <Checkbox
                id={day === 'Täglich' ? 'weekday-all' : `weekday-${daysOfWeekNumbers[day]}`}
                name={day === 'Täglich' ? 'weekday-all' : `weekday-${daysOfWeekNumbers[day]}`}
                checked={day === 'Täglich' ? selectedDays.length === daysOfWeek.length : selectedDays.includes(daysOfWeekNumbers[day])}
                onChange={() => handleDaySelect(day)}
              />
            }
            label={day}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
};

export default WeekdaysSelect;
