import { TextField } from '@mui/material';
import PropTypes from 'prop-types';

const MinuteField = ({ selectedMinute, setSelectedMinute, error }) => {

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
};

export default MinuteField;
