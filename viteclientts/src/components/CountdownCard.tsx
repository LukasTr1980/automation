import React from 'react';
import { Typography, Card, CardContent, Box } from '@mui/material';
import { CountdownCardProps } from '../types/types';

const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
        hours: hrs.toString().padStart(2, '0'),
        minutes: mins.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0')
    };
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'start':
      return 'success.main';
    case 'stop':
      return 'error.main';
    case 'reset':
      return 'warning.main';
    default:
      return 'text.disabled';
  }
};

const CountdownCard: React.FC<CountdownCardProps> = ({ zoneName, countdown }) => {
    const formattedTime = formatTime(countdown.value);
    return (
        <Card variant="outlined" sx={{ m: 2, borderRadius: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {zoneName}
                </Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getStatusColor(countdown.control) }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
                    {countdown.control.toUpperCase()}
                  </Typography>
                </Box>
            </Box>
            <CardContent sx={{ pt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.hours}</Typography>
                        <Typography variant="caption" color="text.secondary">Stunden</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.minutes}</Typography>
                        <Typography variant="caption" color="text.secondary">Minuten</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.seconds}</Typography>
                        <Typography variant="caption" color="text.secondary">Sekunden</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CountdownCard;
