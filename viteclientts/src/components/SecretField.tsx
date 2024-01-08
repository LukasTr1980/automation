// SecretField.tsx
import { TextField } from '@mui/material';
import CustomButton from './Button';
import { SecretFieldProps } from '../types/types';

const SecretField: React.FC<SecretFieldProps> = ({ 
  label, 
  secretValue, 
  placeholder,
  isFocused, 
  isValid,
  onFocus,
  onBlur,
  onChange,
  onUpdate,
  type = 'text',
  autoComplete = 'off'
}) => {
  return (
    <>
      <TextField
        label={label}
        type={type}
        variant="outlined"
        fullWidth
        autoComplete={autoComplete}
        value={isFocused ? secretValue : ''}
        placeholder={placeholder && !isFocused ? "••••••••••••••••••" : ""}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        error={!isValid}
        sx={{ marginTop: '30px' }}
      />
      <CustomButton
        onClick={onUpdate}
      >
        New {label}
      </CustomButton>
    </>
  );
};

export default SecretField;
