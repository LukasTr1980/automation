import { Skeleton, Box  } from '@mui/material';

const SkeletonLoader = () => {

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" height="100%" alignItems='center'>

      <Skeleton variant="circular" width={60} height={62} />

      <Skeleton
        variant="rectangular"
        width="100%"
        height={36.5}
        style={{ marginTop: 16 }}
      />
    </Box>
  );
};

export default SkeletonLoader;