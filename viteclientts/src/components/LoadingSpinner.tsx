import { Box, CircularProgress } from '@mui/material';
import React from 'react';

type LoadingSpinnerProps = {
  size?: number;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 50 }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <CircularProgress size={size} />
  </Box>
);

export default LoadingSpinner;
