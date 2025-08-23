// MonthsSelect.tsx
import { Checkbox, FormControl, FormControlLabel, FormGroup } from '@mui/material';
import { useMonths, useMonthsNumbers } from './constants';
import PropTypes from 'prop-types';
import { MonthsSelectProps } from '../types/types';

const MonthsSelect: React.FC<MonthsSelectProps> = ({ selectedMonths, setSelectedMonths }) => {
  const initialMonths = useMonths();
  const months = ['Jeden Monat', ...initialMonths];
  const monthsNumbers = useMonthsNumbers();

  const handleMonthSelect = (month: string) => {
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
                id={month === 'Jeden Monat' ? 'month-all' : `month-${monthsNumbers[month]}`}
                name={month === 'Jeden Monat' ? 'month-all' : `month-${monthsNumbers[month]}`}
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

MonthsSelect.propTypes = {
  selectedMonths: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
  setSelectedMonths: PropTypes.func.isRequired,
};

export default MonthsSelect;
