import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import PropTypes from 'prop-types';

const SwitchComponent = ({ checked, label, handleToggle, disabled = false, color = 'primary', id, name }) => (
  <div>
    <Typography variant="body1" align="center">{label}</Typography>
    <Switch
      id={id}
      name={name}
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
  id: PropTypes.string,
  name: PropTypes.string
};


export default SwitchComponent;
