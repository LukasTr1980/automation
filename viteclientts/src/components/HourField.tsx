import { TextField } from '@mui/material';
import React from 'react';
import { HourFieldProps } from '../types/types';

const HourField: React.FC<HourFieldProps> = ({ selectedHour, setSelectedHour, error, min = 0, max = 23 }) => {

  const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      setSelectedHour(value);
    }
  };
  return (
    <TextField
      label={'Stunde'}
      type="number"
      slotProps={{ input: { inputProps: { min, max } } }}
      value={selectedHour}
      onChange={handleHourChange}
      variant="outlined"
      fullWidth
      error={error}
    />
  );
}

export default HourField;
