// SecretField.tsx
import { TextField } from '@mui/material';
import CustomButton from './Button';

interface SecretFieldProps {
  label: string;
  secretValue: string;
  placeholder?: boolean;
  isFocused: boolean;
  isValid: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onUpdate: () => void;
  type?: string;
  autoComplete?: string;
}

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
