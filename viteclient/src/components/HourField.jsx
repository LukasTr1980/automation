import { TextField } from '@mui/material';
import PropTypes from 'prop-types';

const HourField = ({ selectedHour, setSelectedHour, error }) => {

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
};

export default HourField;
