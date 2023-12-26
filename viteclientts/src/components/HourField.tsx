import { TextField } from '@mui/material';
import React from 'react';

type HourFieldProps = {
  selectedHour: number | string;
  setSelectedHour: (value: string) => void;
  error?: boolean;
  min?: number;
  max?: number;
};

const HourField: React.FC<HourFieldProps> = ({ selectedHour, setSelectedHour, error, min = 0, max = 23 }) => {

  const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSelectedHour(value); // Always pass a string to setSelectedHour
  };

  return (
    <TextField
      label="Stunde"
      type="number"
      InputProps={{ inputProps: { min, max } }}
      value={selectedHour}
      onChange={handleHourChange}
      variant="outlined"
      fullWidth
      error={error}
    />
  );
}

export default HourField;
