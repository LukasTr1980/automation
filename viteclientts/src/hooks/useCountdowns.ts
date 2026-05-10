import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { type CountdownsState, type DetailedCountdown } from '../types/types';

const COUNTDOWN_TICK_MS = 1000;
const SOCKET_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
const SOCKET_RESUME_RECONNECT_DELAY_MS = 1000;

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

function canOpenRealtimeConnection(): boolean {
  return document.visibilityState !== 'hidden' && navigator.onLine !== false;
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
    let socket: ReturnType<typeof io> | null = null;
    let reconnectTimerId: number | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerId !== null) {
        window.clearTimeout(reconnectTimerId);
        reconnectTimerId = null;
      }
    };

    const closeSocket = () => {
      clearReconnectTimer();
      if (socket) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
      }
    };

    const connect = () => {
      if (disposed || !canOpenRealtimeConnection() || socket?.connected) {
        return;
      }

      clearReconnectTimer();

      socket = socketOrigin
        ? io(socketOrigin, {
            autoConnect: false,
            reconnection: false,
            transports: ['websocket'],
            withCredentials: true,
          })
        : io({
            autoConnect: false,
            reconnection: false,
            transports: ['websocket'],
            withCredentials: true,
          });

      socket.on('connect', () => {
        reconnectAttempt = 0;
        void queryClient.invalidateQueries({ queryKey: countdownsQueryKey });
      });

      socket.on('redis-countdown-update', (event: RedisCountdownUpdate) => {
        queryClient.setQueryData<CountdownsState>(countdownsQueryKey, (current) =>
          updateCountdownFromSocket(current, event)
        );
      });

      socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
          closeSocket();
          scheduleReconnect();
        }
      });

      socket.on('connect_error', () => {
        closeSocket();
        scheduleReconnect();
      });

      socket.connect();
    };

    const scheduleReconnect = (delayOverrideMs?: number) => {
      if (disposed || !canOpenRealtimeConnection()) {
        return;
      }

      clearReconnectTimer();
      const delay =
        delayOverrideMs ??
        SOCKET_RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, SOCKET_RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttempt = Math.min(reconnectAttempt + 1, SOCKET_RECONNECT_DELAYS_MS.length - 1);
      reconnectTimerId = window.setTimeout(() => {
        reconnectTimerId = null;
        connect();
      }, delay);
    };

    const reconnectAfterResume = () => {
      if (!canOpenRealtimeConnection()) {
        return;
      }

      reconnectAttempt = 0;
      closeSocket();
      scheduleReconnect(SOCKET_RESUME_RECONNECT_DELAY_MS);
    };

    const closeForSuspension = () => {
      reconnectAttempt = 0;
      closeSocket();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        closeForSuspension();
        return;
      }
      reconnectAfterResume();
    };

    connect();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', closeForSuspension);
    window.addEventListener('freeze', closeForSuspension);
    window.addEventListener('offline', closeForSuspension);
    window.addEventListener('pageshow', reconnectAfterResume);
    window.addEventListener('resume', reconnectAfterResume);
    window.addEventListener('online', reconnectAfterResume);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', closeForSuspension);
      window.removeEventListener('freeze', closeForSuspension);
      window.removeEventListener('offline', closeForSuspension);
      window.removeEventListener('pageshow', reconnectAfterResume);
      window.removeEventListener('resume', reconnectAfterResume);
      window.removeEventListener('online', reconnectAfterResume);
      closeSocket();
    };
  }, [queryClient, socketOrigin]);

  return countdownsQuery;
}
