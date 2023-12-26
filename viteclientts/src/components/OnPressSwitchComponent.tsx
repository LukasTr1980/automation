// OnPressSwitchComponent.tsx
import { useEffect, useState } from 'react';
import { Button, Box } from '@mui/material';

interface OnPressSwitchComponentProps {
  markiseState: string | null;
  onSend: (value: number) => void;
}

const OnPressSwitchComponent: React.FC<OnPressSwitchComponentProps> = ({ markiseState, onSend }) => {
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [pressedButton, setPressedButton] = useState<'up' | 'down' | 'pause' | null>(null);

  useEffect(() => {
    if (markiseState !== null) {
      const button = markiseState === '1' ? 'up' : markiseState === '2' ? 'down' : markiseState === '3' ? 'pause' : null;
      setPressedButton(button);
    }
  }, [markiseState]);

  const stopSendingValue = (skipSendingThree = false) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setPressedButton('pause');
    if (!skipSendingThree) {
      onSend(3);
    }
  };

  const startSendingValue = (value: number, button: 'up' | 'down' | 'pause') => {
    stopSendingValue(true);
    setPressedButton(button);
    onSend(value);
    const newTimeoutId = window.setTimeout(() => stopSendingValue(), 20000);
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
          sx={{ width: '200px' }}
        >
          Ausfahren
        </Button>
        <Button
          variant={pressedButton === 'pause' ? 'contained' : 'outlined'}
          onClick={handlePause}
          sx={{ width: '200px' }}
        >
          Pause
        </Button>
        <Button
          variant={pressedButton === 'down' ? 'contained' : 'outlined'}
          onMouseDown={handlePressDown}
          sx={{ width: '200px' }}
        >
          Einfahren
        </Button>
      </Box>
    </Box>
  );
};

export default OnPressSwitchComponent;
