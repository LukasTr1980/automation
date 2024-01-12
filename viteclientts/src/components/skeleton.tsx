import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

const SkeletonLoader = () => {
  return (
    <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
      {/* Mimic SwitchComponent */}
      <Skeleton variant="circular" width={60} height={62} />
      
      {/* Mimic TextField */}
      <Skeleton variant="rectangular" width="100%" height={263} style={{ marginTop: 16 }} />
    </Box>
  );
};

export default SkeletonLoader;
