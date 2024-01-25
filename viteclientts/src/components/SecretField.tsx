// SecretField.tsx
import { Button, TextField } from '@mui/material';
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
      <Button
        onClick={onUpdate}
        variant='contained'
        sx={{ width: '300px', my: 2 }}
      >
        Update
      </Button>
    </>
  );
};

export default SecretField;
