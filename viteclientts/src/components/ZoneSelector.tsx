import React from 'react';
import { Box, FormControl, FormLabel, ToggleButton } from '@mui/material';
import { zoneOrder, bewaesserungsTopicsSet } from './constants';

type ZoneSelectorProps = {
  value: string; // selected topic value
  onChange: (value: string) => void;
  labels?: string[]; // defaults to zoneOrder (human-readable)
  values?: string[]; // defaults to bewaesserungsTopicsSet (MQTT topics)
  ariaLabel?: string;
};

const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  value,
  onChange,
  labels = zoneOrder,
  values = bewaesserungsTopicsSet,
  ariaLabel = 'Zone',
}) => {
  return (
    <FormControl fullWidth component="fieldset" sx={{ mb: 1 }}>
      <FormLabel id="zone-toggle-label" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>{ariaLabel}</FormLabel>
      <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' }, mt: 1, flexWrap: 'wrap', gap: 1 }}>
        {labels.map((label, i) => (
          <ToggleButton
            key={values[i]}
            value={values[i]}
            selected={value === values[i]}
            onClick={() => onChange(values[i])}
            aria-label={label}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 1.5,
              py: 1,
              minWidth: { xs: 120, sm: 140 },
              justifyContent: 'center',
            }}
          >
            {label}
          </ToggleButton>
        ))}
      </Box>
    </FormControl>
  );
};

export default ZoneSelector;

