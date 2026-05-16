import { Avatar, Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import InfoPopover from './InfoPopover';
import { useMemo } from 'react';
import umbrellaUrl from '../assets/icons/umbrella.svg';
import sunUrl from '../assets/icons/sun.svg';

type Props = {
  loading?: boolean;
  rainTodayForecast?: number | null; // mm
  rainProbTodayForecast?: number | null; // %
  rainNextDay?: number | null; // mm
  rainProbNextDay?: number | null; // %
};

function hasForecastValues(rainMm?: number | null, probabilityPct?: number | null): boolean {
  return typeof rainMm === 'number' && typeof probabilityPct === 'number';
}

function expectsRain(rainMm?: number | null, probabilityPct?: number | null): boolean {
  return typeof rainMm === 'number' && typeof probabilityPct === 'number' && probabilityPct >= 50 && rainMm > 0.1;
}

function ForecastLine({ label, rainMm, probabilityPct }: { label: string; rainMm?: number | null; probabilityPct?: number | null }) {
  const hasValues = hasForecastValues(rainMm, probabilityPct);
  const valueText = hasValues
    ? `${(rainMm as number).toFixed(1)} mm · ${(probabilityPct as number).toFixed(0)} %`
    : 'k. A.';

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'baseline', gap: 1, width: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'left', lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {valueText}
      </Typography>
    </Box>
  );
}

export default function ForecastCard({
  loading = false,
  rainTodayForecast = null,
  rainProbTodayForecast = null,
  rainNextDay = null,
  rainProbNextDay = null,
}: Props) {
  const hasTodayValues = hasForecastValues(rainTodayForecast, rainProbTodayForecast);
  const hasTomorrowValues = hasForecastValues(rainNextDay, rainProbNextDay);
  const hasAnyValues = hasTodayValues || hasTomorrowValues;
  const forecastRain = useMemo(() => {
    if (!hasAnyValues) return null;
    return expectsRain(rainTodayForecast, rainProbTodayForecast) || expectsRain(rainNextDay, rainProbNextDay);
  }, [hasAnyValues, rainTodayForecast, rainProbTodayForecast, rainNextDay, rainProbNextDay]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', height: '100%', minHeight: { xs: 150, md: 160 } }}>
      {loading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 }} />
      )}
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateRows: { xs: '48px auto', md: '56px auto' },
          justifyItems: 'center',
          rowGap: { xs: 0.5, md: 0.5 },
          textAlign: 'center',
          height: '100%',
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.25 },
        }}
      >
        <Avatar
          sx={{
            bgcolor: forecastRain === null ? 'transparent' : (forecastRain ? 'primary.main' : 'warning.light'),
            color: forecastRain === null ? undefined : 'common.white',
            width: { xs: 44, md: 52 },
            height: { xs: 44, md: 52 },
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
              sx={{ width: { xs: 24, md: 28 }, height: { xs: 24, md: 28 }, display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          ) : (
            <Box
              component="img"
              src={sunUrl}
              alt=""
              aria-hidden
              sx={{
                width: { xs: 24, md: 28 },
                height: { xs: 24, md: 28 },
                display: 'block',
                filter: forecastRain === null ? 'grayscale(1)' : 'brightness(0) invert(1)',
                opacity: forecastRain === null ? 0.35 : 1,
              }}
            />
          )}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            Regenprognose
            <InfoPopover
              ariaLabel="Hinweis zur Prognose"
              content={
                hasAnyValues
                  ? 'Zeigt, wie viel Regen laut Prognose noch heute und morgen fallen kann. Die Prozentzahl sagt, wie wahrscheinlich Regen ist.'
                  : 'Keine Regenprognose verfügbar.'
              }
              iconSize={16}
            />
          </Typography>
          <Box sx={{ width: '100%', minWidth: 0, display: 'grid', gap: 0.4, mt: 0.5 }} aria-live="polite">
            <ForecastLine label="Heute noch" rainMm={rainTodayForecast} probabilityPct={rainProbTodayForecast} />
            <ForecastLine label="Morgen" rainMm={rainNextDay} probabilityPct={rainProbNextDay} />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, lineHeight: 1.2 }}>
            {forecastRain === null ? 'Keine Daten' : forecastRain ? 'Regen erwartet' : 'Kaum Regen erwartet'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
