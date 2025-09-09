import { Avatar, Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import InfoPopover from './InfoPopover';
import { useMemo } from 'react';
import umbrellaUrl from '../assets/icons/umbrella.svg';
import sunUrl from '../assets/icons/sun.svg';

type Props = {
  loading?: boolean;
  rainNextDay?: number | null; // mm
  rainProbNextDay?: number | null; // %
  effectiveForecast?: number | null; // mm (weighted)
};

export default function ForecastCard({ loading = false, rainNextDay = null, rainProbNextDay = null, effectiveForecast = null }: Props) {
  const hasValues = typeof rainNextDay === 'number' && typeof rainProbNextDay === 'number';
  const forecastRain = useMemo(() => {
    if (!hasValues) return null;
    // Consider rain predicted if probability ≥ 50% and amount > 0.1 mm
    return (rainProbNextDay as number) >= 50 && (rainNextDay as number) > 0.1;
  }, [hasValues, rainNextDay, rainProbNextDay]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', height: '100%', minHeight: { xs: 140, md: 160 } }}>
      {loading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
      )}
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateRows: { xs: '56px auto auto', md: '64px auto auto' },
          justifyItems: 'center',
          rowGap: 0.75,
          textAlign: 'center',
          height: '100%',
        }}
      >
        <Avatar
          sx={{
            bgcolor: forecastRain === null ? 'transparent' : (forecastRain ? 'primary.main' : 'success.main'),
            color: forecastRain === null ? undefined : 'common.white',
            width: { xs: 48, md: 56 },
            height: { xs: 48, md: 56 },
            alignSelf: 'center',
            border: forecastRain === null ? '1px solid' : 'none',
            borderColor: forecastRain === null ? 'divider' : 'transparent',
            boxShadow: 'none',
          }}
        >
          {forecastRain ? (
            <Box
              component="img"
              src={umbrellaUrl}
              alt=""
              aria-hidden
              sx={{ width: { xs: 26, md: 30 }, height: { xs: 26, md: 30 }, display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          ) : (
            <Box
              component="img"
              src={sunUrl}
              alt=""
              aria-hidden
              sx={{ width: { xs: 26, md: 30 }, height: { xs: 26, md: 30 }, display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          )}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            Prognose (morgen)
            <InfoPopover
              ariaLabel="Hinweis zur Prognose"
              content={
                hasValues
                  ? `Gewichtete Erwartung: ${(effectiveForecast ?? 0).toFixed(1)} mm (mm × Wahrscheinlichkeit)`
                  : 'Gewichtete Erwartung: k. A.'
              }
              iconSize={16}
            />
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }} aria-live="polite">
            {hasValues
              ? `${(rainNextDay as number).toFixed(1)} mm · ${(rainProbNextDay as number).toFixed(0)} %`
              : 'k. A.'}
          </Typography>
          {forecastRain !== null && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {forecastRain ? 'Regen vorhergesagt' : 'Kein Regen erwartet'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
