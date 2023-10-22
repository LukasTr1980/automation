//Minutefield.jsx
import { TextField } from '@mui/material';
import PropTypes from 'prop-types';

const MinuteField = ({ selectedMinute, setSelectedMinute, error, min = 0, max = 59 }) => {

  const handleMinuteChange = (event) => {
    const value = event.target.value;
    if (value >= min && value <= max) {
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
