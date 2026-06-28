import { useQuery } from '@tanstack/react-query';

export const WEATHER_STATION_ERROR_MINUTES = 30;
export const WEATHER_STATION_REFETCH_MS = 2 * 60 * 1000;

export type WeatherLatestResponse = {
  latest?: {
    temperatureC?: number | null;
    humidity?: number | null;
    rainRateMmPerHour?: number | null;
    timestamp?: string;
    observedAt?: string;
    cachedAt?: string;
    stale?: boolean;
  } | null;
  aggregates?: {
    timestamp?: string;
    meansTimestamp?: string;
  } | null;
};

export type WeatherStationStatus = {
  hasError: boolean;
  observedAt: string | null;
  ageMinutes: number | null;
  errorReason: 'missing' | 'invalid' | 'stale' | 'query' | null;
};

export type WeatherStationStatusOptions = {
  isPending?: boolean;
  isFetching?: boolean;
  dataUpdatedAt?: number;
};

function joinApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl || baseUrl === '/') return normalizedPath;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export function formatRelativeWeatherAge(ageMinutes: number | null): string {
  if (ageMinutes === null) return 'unbekannt';
  if (ageMinutes <= 0) return 'gerade eben';
  if (ageMinutes === 1) return 'vor 1 Minute';
  if (ageMinutes < 60) return `vor ${ageMinutes} Minuten`;
  const hours = Math.floor(ageMinutes / 60);
  if (hours === 1) return 'vor 1 Stunde';
  if (hours < 48) return `vor ${hours} Stunden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'vor 1 Tag';
  return `vor ${days} Tagen`;
}

export function formatWeatherDateTimeDE(timestamp: string | null | undefined): string {
  if (!timestamp) return 'unbekannt';
  try {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
  } catch {
    return 'unbekannt';
  }
}

export function getWeatherStationStatus(
  data: WeatherLatestResponse | undefined,
  isError = false,
  nowMs = Date.now(),
  options: WeatherStationStatusOptions = {},
): WeatherStationStatus {
  if (isError) {
    return { hasError: true, observedAt: null, ageMinutes: null, errorReason: 'query' };
  }

  if (!data && (options.isPending || options.isFetching)) {
    return { hasError: false, observedAt: null, ageMinutes: null, errorReason: null };
  }

  const observedAt = data?.latest?.observedAt ?? data?.latest?.timestamp ?? null;
  if (!observedAt) {
    if (options.isFetching) {
      return { hasError: false, observedAt: null, ageMinutes: null, errorReason: null };
    }
    return { hasError: true, observedAt: null, ageMinutes: null, errorReason: 'missing' };
  }

  const observedMs = new Date(observedAt).getTime();
  if (Number.isNaN(observedMs)) {
    return { hasError: true, observedAt, ageMinutes: null, errorReason: 'invalid' };
  }

  const ageMinutes = Math.max(0, Math.floor((nowMs - observedMs) / 60000));
  const isServerStale = data?.latest?.stale === true;
  const isClientStale = ageMinutes >= WEATHER_STATION_ERROR_MINUTES;
  const dataAgeMs = options.dataUpdatedAt ? nowMs - options.dataUpdatedAt : 0;
  const isVerifyingExpiredCache = options.isFetching === true && dataAgeMs >= WEATHER_STATION_REFETCH_MS;
  const isStale = isServerStale || (isClientStale && !isVerifyingExpiredCache);

  return {
    hasError: isStale,
    observedAt,
    ageMinutes,
    errorReason: isStale ? 'stale' : null,
  };
}

export function useWeatherStationStatus() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const query = useQuery<WeatherLatestResponse>({
    queryKey: ['weather', 'latest'],
    queryFn: async () => {
      const response = await fetch(joinApiUrl(apiUrl, '/weather/latest'));
      if (!response.ok) throw new Error('weather');
      return response.json();
    },
    staleTime: WEATHER_STATION_REFETCH_MS,
    refetchInterval: WEATHER_STATION_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    placeholderData: (previous) => previous,
  });

  return {
    query,
    status: getWeatherStationStatus(query.data, query.isError, Date.now(), {
      isPending: query.isPending,
      isFetching: query.isFetching,
      dataUpdatedAt: query.dataUpdatedAt,
    }),
  };
}
