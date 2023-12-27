import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React from 'react';

const BackButton: React.FC = () => {

  return (
    <Button startIcon={<ArrowBackIcon />} onClick={() => window.history.back()}>
      Back
    </Button>
  );
}

export default BackButton;
