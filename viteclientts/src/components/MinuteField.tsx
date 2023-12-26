// MinuteField.tsx

import { TextField } from '@mui/material';
import React, { ChangeEvent } from 'react';

interface MinuteFieldProps {
  selectedMinute: number | string;
  setSelectedMinute: (minute: string) => void; // Accepts only string now
  error?: boolean;
  min?: number;
  max?: number;
}

const MinuteField: React.FC<MinuteFieldProps> = ({ selectedMinute, setSelectedMinute, error, min = 0, max = 59 }) => {

  const handleMinuteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (parseInt(value) >= min && parseInt(value) <= max) {
      setSelectedMinute(value); // Passing string to setSelectedMinute
    }
  };

  return (
    <TextField
      label="Minute"
      type="number"
      InputProps={{ inputProps: { min, max } }}
      value={selectedMinute}
      onChange={handleMinuteChange}
      variant="outlined"
      fullWidth
      error={error}
    />
  );
};

export default MinuteField;
