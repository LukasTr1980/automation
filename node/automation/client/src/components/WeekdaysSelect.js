import { Checkbox, FormControl, FormControlLabel, FormGroup } from '@mui/material';
import { daysOfWeek, daysOfWeekNumbers } from './constants';

const WeekdaysSelect = ({ selectedDays, setSelectedDays }) => {
  const allDays = ['Täglich', ...daysOfWeek]; // 'Täglich' is now the first item

  const handleDaySelect = (day) => {
    if (day === 'Täglich') {
      if (selectedDays.length === daysOfWeek.length) {
        setSelectedDays([]); // Unselect all days if "Täglich" is chosen and all days are currently selected
      } else {
        setSelectedDays(daysOfWeek.map(day => daysOfWeekNumbers[day]).sort((a, b) => a - b)); // Select all days if not all days are currently selected
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
