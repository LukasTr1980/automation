// LoadingSpinner.js
import { Box, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 50 }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <CircularProgress size={size} />
  </Box>
);

LoadingSpinner.propTypes = {
  size: PropTypes.number,
};

export default LoadingSpinner;
