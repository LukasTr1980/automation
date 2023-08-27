import { Checkbox, FormControl, FormControlLabel, FormGroup } from '@mui/material';
import { months as initialMonths, monthsNumbers } from './constants';

const MonthsSelect = ({ selectedMonths, setSelectedMonths }) => {
  const months = ['Jeden Monat', ...initialMonths];

  const handleMonthSelect = (month) => {
    if (month === 'Jeden Monat') {
      if (selectedMonths.length === initialMonths.length) {
        setSelectedMonths([]);
      } else {
        setSelectedMonths(Object.values(monthsNumbers).sort((a, b) => a - b));
      }
    } else {
      const monthNumber = monthsNumbers[month];
      if (selectedMonths.includes(monthNumber)) {
        setSelectedMonths(selectedMonths.filter((m) => m !== monthNumber).sort((a, b) => a - b));
      } else {
        setSelectedMonths([...selectedMonths, monthNumber].sort((a, b) => a - b));
      }
    }
  };

  return (
    <FormControl component="fieldset">
      <FormGroup>
        {months.map((month, index) => (
          <FormControlLabel
            key={`${month}-${index}`}
            control={
              <Checkbox
                checked={month === 'Jeden Monat' ? selectedMonths.length === initialMonths.length : selectedMonths.includes(monthsNumbers[month])}
                onChange={() => handleMonthSelect(month)}
              />
            }
            label={month}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
};

export default MonthsSelect;
