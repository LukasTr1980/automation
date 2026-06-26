import { Alert, Box, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoPopover from './InfoPopover';
import {
  formatRelativeWeatherAge,
  formatWeatherDateTimeDE,
  useWeatherStationStatus,
} from '../hooks/useWeatherStationStatus';

export default function WeatherFaultBanner() {
  const { status } = useWeatherStationStatus();

  if (!status.hasError) return null;

  const ageLabel = formatRelativeWeatherAge(status.ageMinutes);
  const detail = status.observedAt
    ? `Letzter Messwert: ${formatWeatherDateTimeDE(status.observedAt)} (${ageLabel}). Die automatische Bewässerung bleibt blockiert, bis aktuelle Wetterstationsdaten vorliegen.`
    : 'Es liegt kein gültiger Zeitstempel der Wetterstation vor. Die automatische Bewässerung bleibt blockiert, bis aktuelle Wetterstationsdaten vorliegen.';

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
          Wetterstation gestört: Automatische Bewässerung blockiert.
        </Typography>
        <Typography component="p" variant="body2">
          {status.observedAt ? `Letzter Messwert ${ageLabel}.` : 'Keine aktuellen Wetterdaten verfügbar.'}
        </Typography>
      </Box>
    </Alert>
  );
}
