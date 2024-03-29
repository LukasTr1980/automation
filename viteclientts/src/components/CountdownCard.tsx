import React from 'react';
import { Typography, Card, CardContent, Box } from '@mui/material';
import { CountdownCardProps } from '../types/types';
import { useTranslation } from 'react-i18next';

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

const getStatusBackgroundColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'start':
            return 'lightgreen';
        case 'stop':
            return '#ff6666';
        case 'reset':
            return 'orange';
        default:
            return 'transparent';
    }
};

const CountdownCard: React.FC<CountdownCardProps> = ({ zoneName, countdown }) => {
    const { t } = useTranslation();
    const formattedTime = formatTime(countdown.value);
    return (
        <Card sx={{ m: 2, boxShadow: 3 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="subtitle1">
                    {zoneName}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        backgroundColor: getStatusBackgroundColor(countdown.control),
                        padding: '0.2em 0.4em',
                        borderRadius: '4px'
                    }}
                >
                    {countdown.control.toUpperCase()}
                </Typography>
            </Box>
            <CardContent sx={{ pt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.hours}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('hours')}</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.minutes}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('minutes')}</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.seconds}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('seconds')}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CountdownCard;
