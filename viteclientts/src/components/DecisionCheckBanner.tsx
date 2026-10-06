import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router';
import { useDecisionCheckStatus } from '../hooks/useDecisionCheckStatus';

export default function DecisionCheckBanner() {
  const location = useLocation();
  const { query, skipDecision } = useDecisionCheckStatus();

  if (query.isPending && !query.data) return null;

  if (query.isError) {
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
      >
        <Box sx={{ display: 'grid', gap: 0.25 }}>
          <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
            Status der Entscheidungsprüfung unbekannt
          </Typography>
          <Typography component="p" variant="body2">
            Es konnte nicht geprüft werden, ob automatische Zeitpläne mit Schutzprüfung laufen.
          </Typography>
        </Box>
      </Alert>
    );
  }

  if (skipDecision !== true) return null;

  const action = location.pathname === '/bewaesserung'
    ? undefined
    : (
        <Button
          component={RouterLink}
          to="/bewaesserung"
          color="inherit"
          size="small"
        >
          Zur Bewässerung
        </Button>
      );

  return (
    <Alert
      severity="warning"
      variant="outlined"
      icon={<WarningAmberIcon />}
      action={action}
      sx={{
        mb: { xs: 2, md: 3 },
        borderRadius: 2,
        alignItems: 'center',
        textAlign: 'left',
      }}
    >
      <Box sx={{ display: 'grid', gap: 0.25 }}>
        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
          Entscheidungsprüfung deaktiviert
        </Typography>
        <Typography component="p" variant="body2">
          Automatische Zeitpläne werden ohne Prüfung von Wetter und Wasserreserve ausgeführt.
        </Typography>
      </Box>
    </Alert>
  );
}
