import { TextField } from '@mui/material';
import React, { ChangeEvent, useMemo } from 'react';
import { MinuteFieldProps } from '../types/types';

const MinuteField: React.FC<MinuteFieldProps> = ({ selectedMinute, setSelectedMinute, error, min = 0, max = 59 }) => {
  const maxLen = useMemo(() => String(Math.max(Math.abs(max), 0)).length, [max]);

  const parse = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const inRange = (n: number) => !Number.isNaN(n) && n >= min && n <= max;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;
    if (v === '' || /^[0-9]+$/.test(v)) {
      if (v.length <= maxLen) setSelectedMinute(v);
    }
  };

  const handleBlur = () => {
    const v = String(selectedMinute ?? '');
    if (v === '') return;
    const n = parse(v);
    if (!inRange(n)) {
      const clamped = Math.min(Math.max(isNaN(n) ? min : n, min), max);
      setSelectedMinute(String(clamped).padStart(2, '0'));
    } else {
      setSelectedMinute(String(n).padStart(2, '0'));
    }
  };

  const currentInvalid = (() => {
    const v = String(selectedMinute ?? '');
    if (v === '') return false;
    const n = parse(v);
    return !inRange(n);
  })();

  const showError = Boolean(error || currentInvalid);

  return (
    <TextField
      label={'Minute'}
      id="minute-field"
      name="minute"
      type="text"
      value={selectedMinute}
      onChange={handleChange}
      onBlur={handleBlur}
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', 'aria-label': 'Minute' }}
      variant="outlined"
      fullWidth
      error={showError}
      helperText={showError ? `Gültig: ${min}–${max}` : ' '}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
    />
  );
};

export default MinuteField;
