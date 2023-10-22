import { TextField } from '@mui/material';
import PropTypes from 'prop-types';

const HourField = ({ selectedHour, setSelectedHour, error, min = 0, max = 23 }) => {

  const handleHourChange = (event) => {
    const value = event.target.value;
    if (value >= min && value <= max) {
      setSelectedHour(value);
    }
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

HourField.propTypes = {
  selectedHour: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  setSelectedHour: PropTypes.func.isRequired,
  error: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
};

export default HourField;
