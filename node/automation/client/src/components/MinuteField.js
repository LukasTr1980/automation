import React from 'react';
import { TextField } from '@mui/material';

const MinuteField = ({ selectedMinute, setSelectedMinute }) => {

  const handleMinuteChange = (event) => {
    const value = event.target.value;
    if (value >= 0 && value <= 59) {
      setSelectedMinute(value);
    }
  };

  return (
    <TextField
      label="Minute"
      type="number"
      InputProps={{ inputProps: { min: 0, max: 59 } }}
      value={selectedMinute}
      onChange={handleMinuteChange}
      variant="outlined"
      fullWidth
    />
  );
}

export default MinuteField;
