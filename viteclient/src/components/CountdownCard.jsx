//CountdownCard.jsx
import { Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

const CountdownCard = ({ zoneName, countdown }) => {
    return (
        <Box key={countdown.topic} sx={{ p: 2, mb: 2, margin: "10px", border: "1px solid black", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            <Typography variant="h6" align="left" sx={{ mb: 2 }}>{`${zoneName}`}</Typography>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Verbleibende Zeit:`}</Typography>
                <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.value} s`}</Typography>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Engestellte Stunden:`}</Typography>
                <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.hours} h`}</Typography>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Eingestellte Minuten:`}</Typography>
                <Typography sx={{ mb: 1.5 }} component="span">{`${countdown.minutes} m`}</Typography>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ mb: 1.5 }} color="text.secondary" component="span">{`Status:`}</Typography>
                <Typography sx={{ mb: 1.5 }} component="span">{countdown.controlStatus}</Typography>
            </div>
        </Box>
    );
};

CountdownCard.propTypes = {
    zoneName: PropTypes.string.isRequired,
    countdown: PropTypes.shape({
        topic: PropTypes.string,
        value: PropTypes.string.isRequired,
        hours: PropTypes.string.isRequired,
        minutes: PropTypes.string.isRequired,
        controlStatus: PropTypes.string.isRequired,
    }).isRequired,
};

export default CountdownCard;
