import { useLocation } from 'react-router-dom';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BackButton = () => {
  let location = useLocation();

  return (
    <Button variant="text" style={{color: 'white'}} startIcon={<ArrowBackIcon />} onClick={() => window.history.back()}>
      Back
    </Button>
  );
}

export default BackButton;
