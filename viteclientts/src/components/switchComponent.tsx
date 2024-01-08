// SwitchComponent.tsx
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import { SwitchComponentProps } from '../types/types';

const SwitchComponent: React.FC<SwitchComponentProps> = ({ checked, label, handleToggle, disabled = false, color = 'primary', id, name }) => (
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

export default SwitchComponent;
