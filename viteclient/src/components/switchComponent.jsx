import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import PropTypes from 'prop-types';

const SwitchComponent = ({ checked, label, handleToggle, disabled = false, color = 'primary' }) => (
  <div>
    <Typography variant="body1" align="center">{label}</Typography>
    <Switch
      checked={checked}
      onChange={handleToggle}
      disabled={disabled}
      aria-label={label}
      color={color}
    />
  </div>
);

SwitchComponent.propTypes = {
  checked: PropTypes.bool.isRequired,
  label: PropTypes.string,
  handleToggle: PropTypes.func,
  disabled: PropTypes.bool,
  color: PropTypes.string,
};


export default SwitchComponent;
