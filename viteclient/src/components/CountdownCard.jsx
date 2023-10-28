import { Typography, Card, CardContent, Box } from '@mui/material';
import PropTypes from 'prop-types';

// Function to convert seconds into HH:mm:ss format
const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
        hours: hrs.toString().padStart(2, '0'),
        minutes: mins.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0')
    };
};

const getStatusBackgroundColor = (status) => {
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

const CountdownCard = ({ zoneName, countdown }) => {
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
                        <Typography variant="caption" color="text.secondary">STUNDEN</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.minutes}</Typography>
                        <Typography variant="caption" color="text.secondary">MINUTEN</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mx: 1 }}>:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h4">{formattedTime.seconds}</Typography>
                        <Typography variant="caption" color="text.secondary">SEKUNDEN</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

CountdownCard.propTypes = {
    zoneName: PropTypes.string.isRequired,
    countdown: PropTypes.shape({
        topic: PropTypes.string,
        value: PropTypes.number.isRequired,
        control: PropTypes.string.isRequired,
    }).isRequired,
};

export default CountdownCard;
