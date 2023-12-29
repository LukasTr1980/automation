// OnPressSwitchComponent.tsx
import { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import CustomButton from './Button';

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
    <Grid container spacing={2}>
        <Grid item xs={12}>
          <CustomButton
            variant={pressedButton === 'up' ? 'contained' : 'outlined'}
            onMouseDown={handlePressUp}
            fullWidth
          >
            Ausfahren
          </CustomButton>
        </Grid>
        <Grid item xs={12}>
          <CustomButton
            variant={pressedButton === 'pause' ? 'contained' : 'outlined'}
            onClick={handlePause}
          >
            Pause
          </CustomButton>
        </Grid>
        <Grid item xs={12}>
          <CustomButton
            variant={pressedButton === 'down' ? 'contained' : 'outlined'}
            onMouseDown={handlePressDown}
          >
            Einfahren
          </CustomButton>
        </Grid>
        </Grid>
  );
};

export default OnPressSwitchComponent;
