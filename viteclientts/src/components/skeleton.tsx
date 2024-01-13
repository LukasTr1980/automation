import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useTheme, useMediaQuery } from '@mui/material';

const SkeletonLoader = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" height="100%">

      <Skeleton variant="circular" width={60} height={62} />

      <Skeleton
        variant="rectangular"
        width="100%"
        height={isSmallScreen ? 420 : 263}
        style={{ marginTop: 16 }}
      />
    </Box>
  );
};

export default SkeletonLoader;