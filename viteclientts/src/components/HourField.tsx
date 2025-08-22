import { TextField } from '@mui/material';
import React, { useMemo } from 'react';
import { HourFieldProps } from '../types/types';

const HourField: React.FC<HourFieldProps> = ({ selectedHour, setSelectedHour, error, min = 0, max = 23 }) => {
  const maxLen = useMemo(() => String(Math.max(Math.abs(max), 0)).length, [max]);

  const parse = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const inRange = (n: number) => !Number.isNaN(n) && n >= min && n <= max;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;
    if (v === '' || /^[0-9]+$/.test(v)) {
      if (v.length <= maxLen) setSelectedHour(v);
    }
  };

  const handleBlur = () => {
    const v = String(selectedHour ?? '');
    if (v === '') return; // allow empty until parent validates
    const n = parse(v);
    if (!inRange(n)) {
      // Clamp to bounds on blur
      const clamped = Math.min(Math.max(isNaN(n) ? min : n, min), max);
      setSelectedHour(String(clamped).padStart(2, '0'));
    } else {
      setSelectedHour(String(n).padStart(2, '0'));
    }
  };

  const currentInvalid = (() => {
    const v = String(selectedHour ?? '');
    if (v === '') return false; // don't show error on empty while editing
    const n = parse(v);
    return !inRange(n);
  })();

  const showError = Boolean(error || currentInvalid);

  return (
    <TextField
      label={'Stunde'}
      type="text"
      value={selectedHour}
      onChange={handleChange}
      onBlur={handleBlur}
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', 'aria-label': 'Stunde' }}
      variant="outlined"
      fullWidth
      error={showError}
      helperText={showError ? `Gültig: ${min}–${max}` : ' '}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
    />
  );
}

export default HourField;
