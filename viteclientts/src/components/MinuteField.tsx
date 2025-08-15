import { TextField } from '@mui/material';
import React, { ChangeEvent } from 'react';
import { MinuteFieldProps } from '../types/types';

const MinuteField: React.FC<MinuteFieldProps> = ({ selectedMinute, setSelectedMinute, error, min = 0, max = 59 }) => {

  const handleMinuteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      setSelectedMinute(value);
    }
  };
  return (
    <TextField
      label={'Minute'}
      type="number"
      slotProps={{ input: { inputProps: { min, max } } }}
      value={selectedMinute}
      onChange={handleMinuteChange}
      variant="outlined"
      fullWidth
      error={error}
    />
  );
};

export default MinuteField;
