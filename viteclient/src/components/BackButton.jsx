import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BackButton = () => {

  return (
    <Button variant="text" style={{ color: 'white' }} startIcon={<ArrowBackIcon />} onClick={() => window.history.back()}>
      Back
    </Button>
  );
}

export default BackButton;
