import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React from 'react';

const BackButton: React.FC = () => {

  return (
    <Button startIcon={<ArrowBackIcon style={{ color:'white' }} />} onClick={() => window.history.back()} style={{ color:'white' }}>
      Back
    </Button>
  );
}

export default BackButton;
