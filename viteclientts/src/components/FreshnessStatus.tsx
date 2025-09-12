import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import InfoPopover from './InfoPopover';

type Props = {
  latestTimestamp?: string | null;
  aggregatesTimestamp?: string | null;
  meansTimestamp?: string | null;
  soilUpdatedAt?: string | null;
  // When true, hides the soil-bucket freshness row (used on Home page where it moves into the card)
  hideSoilFreshness?: boolean;
  clientIsFetching: boolean;
  clientIsError: boolean;
  clientUpdatedAt?: number;
};

const STALE_WARN_MIN = 10;
const STALE_ERROR_MIN = 30;
const HEARTBEAT_MS = 1000; // tick every second for client seconds display

function formatRelativeMinutes(ts: string): string {
  try {
    const ms = Date.now() - new Date(ts).getTime();
    const mins = Math.max(0, Math.floor(ms / 60000));
    if (mins <= 0) return 'gerade eben';
    if (mins === 1) return 'vor 1 Minute';
    return `vor ${mins} Minuten`;
  } catch {
    return 'unbekannt';
  }
}

function formatDateTimeDE(ts: string | null | undefined): string {
  if (!ts) return 'unbekannt';
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return 'unbekannt';
  }
}

export default function FreshnessStatus({
  latestTimestamp,
  aggregatesTimestamp,
  meansTimestamp,
  soilUpdatedAt,
  hideSoilFreshness = false,
  clientIsFetching,
  clientIsError,
  clientUpdatedAt,
}: Props) {
  // Trigger re-render every second so the seconds label updates while visible
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  const serverStatusColor: string = (() => {
    if (!latestTimestamp) return 'error.main';
    const ageMin = (Date.now() - new Date(latestTimestamp).getTime()) / 60000;
    if (ageMin >= STALE_ERROR_MIN) return 'error.main';
    if (ageMin >= STALE_WARN_MIN) return 'warning.main';
    return 'success.main';
  })();

  const clientStatusColor: string = clientIsError
    ? 'error.main'
    : clientIsFetching
      ? 'info.main'
      : 'success.main';

  const cacheTimestamp = latestTimestamp ?? null;

  // Soil-bucket: success if updated today (local date matches today)
  const soilStatus = (() => {
    if (!soilUpdatedAt) return { color: 'warning.main', label: 'Boden‑Speicher: nicht aktualisiert' } as const;
    try {
      const d = new Date(soilUpdatedAt);
      const now = new Date();
      const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      return sameDay
        ? { color: 'success.main', label: 'Boden‑Speicher: heute aktualisiert' }
        : { color: 'warning.main', label: 'Boden‑Speicher: nicht aktualisiert' };
    } catch {
      return { color: 'warning.main', label: 'Boden‑Speicher: nicht aktualisiert' } as const;
    }
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
      {/* Wetterstation freshness */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: serverStatusColor, flex: '0 0 auto' }} />
        <Typography variant="body2" color="text.secondary">
          Datenaktualität Wetterstation: {cacheTimestamp ? formatRelativeMinutes(cacheTimestamp) : 'unbekannt'}
        </Typography>
        <InfoPopover
          ariaLabel="Wetterstation-Zeitstempel anzeigen"
          content={(() => {
            if (!latestTimestamp && !aggregatesTimestamp) return 'Zeitpunkt unbekannt';
            const aggDisplay = meansTimestamp ?? aggregatesTimestamp ?? cacheTimestamp;
            if (latestTimestamp && aggDisplay && latestTimestamp !== aggDisplay) {
              return `Aktuell: ${formatDateTimeDE(latestTimestamp)} • Aggregiert: ${formatDateTimeDE(aggDisplay)}`;
            }
            return `Stand: ${formatDateTimeDE(cacheTimestamp)}`;
          })()}
          iconSize={16}
        />
      </Box>

      {/* Soil storage freshness (optional) */}
      {!hideSoilFreshness && (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: soilStatus.color, flex: '0 0 auto' }} />
          <Typography variant="body2" color="text.secondary">
            {soilStatus.label}
          </Typography>
          <InfoPopover
            ariaLabel="Boden‑Speicher Aktualisierung"
            content={(() => {
              const when = soilUpdatedAt ? formatDateTimeDE(soilUpdatedAt) : 'unbekannt';
              return `Letzte Aktualisierung: ${when}. Der Boden‑Speicher wird täglich nach Mitternacht (ca. 00:45) anhand von ET₀ (gestern) und Tagesniederschlag neu berechnet.`;
            })()}
            iconSize={16}
          />
        </Box>
      )}

      {/* Client freshness */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: clientStatusColor, flex: '0 0 auto' }} />
        <Typography variant="body2" color="text.secondary">
          {(() => {
            if (clientIsFetching) return 'Anzeigeaktualität: lädt…';
            if (clientIsError) return 'Anzeigeaktualität: Fehler';
            const t = clientUpdatedAt;
            if (!t) return 'Anzeigeaktualität: unbekannt';
            // Seconds granularity for the first minute, then minutes
            const diffMs = Date.now() - t;
            const diffSec = Math.max(0, Math.floor(diffMs / 1000));
            if (diffSec < 60) {
              const sec = Math.max(1, diffSec);
              if (sec === 1) return 'Anzeigeaktualität: vor 1 Sekunde';
              return `Anzeigeaktualität: vor ${sec} Sekunden`;
            }
            return `Anzeigeaktualität: ${formatRelativeMinutes(new Date(t).toISOString())}`;
          })()}
        </Typography>
        <InfoPopover
          ariaLabel="Client-Abrufzeit anzeigen"
          content={(() => {
            const t = clientUpdatedAt;
            if (!t) return 'Zeitpunkt unbekannt';
            return `Letzter Abruf: ${formatDateTimeDE(new Date(t).toISOString())}`;
          })()}
          iconSize={16}
        />
      </Box>
    </Box>
  );
}
