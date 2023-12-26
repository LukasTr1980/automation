// Minutefield.tsx
import { TextField } from '@mui/material';
import PropTypes from 'prop-types';
import { ChangeEvent } from 'react';

interface MinuteFieldProps {
  selectedMinute: number | string;
  setSelectedMinute: (minute: number | string) => void;
  error?: boolean;
  min?: number;
  max?: number;
}

const MinuteField: React.FC<MinuteFieldProps> = ({ selectedMinute, setSelectedMinute, error, min = 0, max = 59 }) => {

  const handleMinuteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (parseInt(value) >= min && parseInt(value) <= max) {
      setSelectedMinute(value);
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
}

MinuteField.propTypes = {
  selectedMinute: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  setSelectedMinute: PropTypes.func.isRequired,
  error: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
};

export default MinuteField;
