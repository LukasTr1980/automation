import { TextField, Button } from '@mui/material';

const SecretField = ({ 
    label, 
    secretValue, 
    placeholder,
    isFocused, 
    isValid,
    onFocus,
    onBlur,
    onChange,
    onUpdate,
    type = 'text'
}) => {
  return (
    <>
      <TextField
        label={label}
        type={type}
        variant="outlined"
        fullWidth
        autoComplete='off'
        value={isFocused ? secretValue : ''}
        placeholder={placeholder && !isFocused ? "••••••••••••••••••" : ""}
        onFocus={() => onFocus()}
        onBlur={() => onBlur()}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        error={!isValid}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={() => onUpdate()}
        sx={{ mt: 2, mb: 2 }}
      >
        Update {label}
      </Button>
    </>
  );
};

export default SecretField;
