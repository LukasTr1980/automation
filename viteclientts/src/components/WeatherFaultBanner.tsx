import { Alert, Box, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InfoPopover from './InfoPopover';
import {
  formatRelativeWeatherAge,
  formatWeatherDateTimeDE,
  useWeatherStationStatus,
} from '../hooks/useWeatherStationStatus';
import { useDecisionCheckStatus } from '../hooks/useDecisionCheckStatus';
import { getWeatherFaultImpactCopy } from '../utils/weatherFaultCopy';

export default function WeatherFaultBanner() {
  const { status } = useWeatherStationStatus();
  const { query: decisionCheckQuery, skipDecision } = useDecisionCheckStatus();

  if (!status.hasError) return null;

  const ageLabel = formatRelativeWeatherAge(status.ageMinutes);
  const { effect, headline } = getWeatherFaultImpactCopy(
    skipDecision,
    decisionCheckQuery.isError,
  );
  const detail = status.observedAt
    ? `Letzter Messwert: ${formatWeatherDateTimeDE(status.observedAt)} (${ageLabel}). ${effect}`
    : `Es liegt kein gültiger Zeitstempel der Wetterstation vor. ${effect}`;

  return (
    <Alert
      severity="error"
      variant="outlined"
      icon={<ErrorOutlineIcon />}
      sx={{
        mb: { xs: 2, md: 3 },
        borderRadius: 2,
        alignItems: 'center',
        textAlign: 'left',
      }}
      action={<InfoPopover ariaLabel="Details zur Wetterstation" content={detail} iconSize={18} />}
    >
      <Box sx={{ display: 'grid', gap: 0.25 }}>
        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
          {headline}
        </Typography>
        <Typography component="p" variant="body2">
          {status.observedAt ? `Letzter Messwert ${ageLabel}.` : 'Keine aktuellen Wetterdaten verfügbar.'}
        </Typography>
      </Box>
    </Alert>
  );
}
