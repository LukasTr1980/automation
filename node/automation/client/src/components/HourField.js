import React from 'react';
import { TextField } from '@mui/material';

const HourField = ({ selectedHour, setSelectedHour }) => {

  const handleHourChange = (event) => {
    const value = event.target.value;
    if (value >= 0 && value <= 23) {
      setSelectedHour(value);
    }
  };

  return (
    <TextField
      label="Stunde"
      type="number"
      InputProps={{ inputProps: { min: 0, max: 23 } }}
      value={selectedHour}
      onChange={handleHourChange}
      variant="outlined"
      fullWidth
    />
  );
}

export default HourField;
