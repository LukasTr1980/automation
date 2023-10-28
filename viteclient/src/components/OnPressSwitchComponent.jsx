import { useEffect, useState } from 'react';
import { Button, Box } from '@mui/material';
import PropTypes from 'prop-types';

const OnPressSwitchComponent = ({ markiseState, onSend }) => {
  const [timeoutId, setTimeoutId] = useState(null);
  const [pressedButton, setPressedButton] = useState(null);

  useEffect(() => {
    if (markiseState !== null) {
      const button = markiseState === '1' ? 'up' : markiseState === '2' ? 'down' : markiseState === '3' ? 'pause' : null;
      setPressedButton(button);
    }
  }, [markiseState]);

  const stopSendingValue = (skipSendingThree = false) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setPressedButton('pause');
    if (!skipSendingThree) {
      onSend(3);
    }
  };

  const startSendingValue = (value, button) => {
    stopSendingValue(true);
    setPressedButton(button);
    onSend(value);
    const newTimeoutId = setTimeout(() => stopSendingValue(), 20000);
    setTimeoutId(newTimeoutId);
  };

  const handlePressUp = () => startSendingValue(1, 'up');
  const handlePressDown = () => startSendingValue(2, 'down');
  const handlePause = () => stopSendingValue();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', width: '100%' }}>
        <Button
          variant={pressedButton === 'up' ? 'contained' : 'outlined'}
          onMouseDown={handlePressUp}
          sx={{ width: '200px' }} // Set the width
        >
          Ausfahren
        </Button>
        <Button
          variant={pressedButton === 'pause' ? 'contained' : 'outlined'}
          onClick={handlePause}
          sx={{ width: '200px' }} // Set the width
        >
          Pause
        </Button>
        <Button
          variant={pressedButton === 'down' ? 'contained' : 'outlined'}
          onMouseDown={handlePressDown}
          sx={{ width: '200px' }} // Set the width
        >
          Einfahren
        </Button>
      </Box>
    </Box>
  );
};

OnPressSwitchComponent.propTypes = {
  markiseState: PropTypes.string,
  onSend: PropTypes.func.isRequired,
};

export default OnPressSwitchComponent;
