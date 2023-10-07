import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';

const SwitchComponent = ({ checked, label, handleToggle, disabled = false }) => (
  <div>
    <Typography variant="body1" align="center">{label}</Typography>
    <Switch
      checked={checked}
      onChange={handleToggle}
      disabled={disabled}
      aria-label={label}
    />
  </div>
);

export default SwitchComponent;
