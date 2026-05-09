import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { type CountdownsState, type DetailedCountdown } from '../types/types';

const COUNTDOWN_TICK_MS = 1000;

export const countdownsQueryKey = ['countdowns', 'current'] as const;

type RedisCountdownUpdate = {
  topic?: string;
  countdownValue?: number | string | null;
  countdownHours?: string | null;
  countdownMinutes?: string | null;
  countdownControl?: string | null;
};

function joinApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (baseUrl === '/') return normalizedPath;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

function getSocketOrigin(apiBaseUrl: string): string | undefined {
  if (!apiBaseUrl || apiBaseUrl.startsWith('/')) return undefined;

  try {
    return new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    return undefined;
  }
}

function normalizeCountdown(countdown: Partial<DetailedCountdown> | undefined): DetailedCountdown {
  return {
    value: Math.max(0, Number(countdown?.value ?? 0)),
    hours: countdown?.hours ?? '0',
    minutes: countdown?.minutes ?? '0',
    control: countdown?.control ?? 'reset',
  };
}

function normalizeCountdowns(countdowns: CountdownsState): CountdownsState {
  return Object.fromEntries(
    Object.entries(countdowns).map(([topic, countdown]) => [topic, normalizeCountdown(countdown)])
  );
}

function applyLocalTick(countdowns: CountdownsState | undefined): CountdownsState | undefined {
  if (!countdowns) return countdowns;

  let changed = false;
  const next = Object.fromEntries(
    Object.entries(countdowns).map(([topic, countdown]) => {
      const normalized = normalizeCountdown(countdown);
      if (normalized.control.toLowerCase() !== 'start' || normalized.value <= 0) {
        return [topic, normalized];
      }

      changed = true;
      return [topic, { ...normalized, value: Math.max(0, normalized.value - 1) }];
    })
  );

  return changed ? next : countdowns;
}

function updateCountdownFromSocket(
  current: CountdownsState | undefined,
  event: RedisCountdownUpdate
): CountdownsState | undefined {
  if (!event.topic) return current;

  const existing = normalizeCountdown(current?.[event.topic]);
  const nextCountdown: DetailedCountdown = {
    value: Math.max(0, Number(event.countdownValue ?? existing.value)),
    hours: event.countdownHours ?? existing.hours,
    minutes: event.countdownMinutes ?? existing.minutes,
    control: event.countdownControl ?? existing.control,
  };

  return {
    ...(current ?? {}),
    [event.topic]: nextCountdown,
  };
}

export function useCountdowns(apiBaseUrl = '/api') {
  const queryClient = useQueryClient();
  const countdownsUrl = useMemo(
    () => joinApiUrl(apiBaseUrl || '/api', '/countdown/currentCountdowns'),
    [apiBaseUrl]
  );
  const socketOrigin = useMemo(() => getSocketOrigin(apiBaseUrl || '/api'), [apiBaseUrl]);

  const countdownsQuery = useQuery<CountdownsState>({
    queryKey: countdownsQueryKey,
    queryFn: async () => {
      const response = await fetch(countdownsUrl);
      if (!response.ok) throw new Error('countdowns');
      return normalizeCountdowns(await response.json());
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      queryClient.setQueryData<CountdownsState>(countdownsQueryKey, applyLocalTick);
    }, COUNTDOWN_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [queryClient]);

  useEffect(() => {
    const socket = socketOrigin
      ? io(socketOrigin, { withCredentials: true })
      : io({ withCredentials: true });

    socket.on('connect', () => {
      void queryClient.invalidateQueries({ queryKey: countdownsQueryKey });
    });

    socket.on('redis-countdown-update', (event: RedisCountdownUpdate) => {
      queryClient.setQueryData<CountdownsState>(countdownsQueryKey, (current) =>
        updateCountdownFromSocket(current, event)
      );
    });

    return () => {
      socket.close();
    };
  }, [queryClient, socketOrigin]);

  return countdownsQuery;
}
