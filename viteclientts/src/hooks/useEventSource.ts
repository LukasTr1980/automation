import { useCallback, useEffect, useRef } from 'react';

type EventSourceControls = {
  reconnect: () => void;
};

type UseEventSourceOptions = {
  url: string | null;
  enabled?: boolean;
  onMessage: (event: MessageEvent, controls: EventSourceControls) => void;
  onError?: (event: Event, controls: EventSourceControls) => void;
  reconnectDelaysMs?: number[];
};

const DEFAULT_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

export function useEventSource({
  url,
  enabled = true,
  onMessage,
  onError,
  reconnectDelaysMs = DEFAULT_RECONNECT_DELAYS_MS,
}: UseEventSourceOptions): EventSourceControls {
  const sourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const urlRef = useRef<string | null>(url);
  const enabledRef = useRef(enabled);
  const delaysRef = useRef(reconnectDelaysMs);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const connectRef = useRef<() => void>(() => {});
  const scheduleReconnectRef = useRef<() => void>(() => {});

  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  delaysRef.current = reconnectDelaysMs;

  const clearReconnectTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearReconnectTimer();
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, [clearReconnectTimer]);

  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    close();
    if (document.visibilityState !== 'hidden') {
      connectRef.current();
    }
  }, [close]);

  const connect = useCallback(() => {
    const currentUrl = urlRef.current;
    if (!enabledRef.current || !currentUrl || document.visibilityState === 'hidden') {
      return;
    }

    close();
    const eventSource = new EventSource(currentUrl);
    sourceRef.current = eventSource;

    eventSource.onopen = () => {
      attemptRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      onMessageRef.current(event, { reconnect });
    };

    eventSource.onerror = (event) => {
      onErrorRef.current?.(event, { reconnect });
      eventSource.close();
      if (sourceRef.current === eventSource) {
        sourceRef.current = null;
      }
      scheduleReconnectRef.current();
    };
  }, [close, reconnect]);

  const scheduleReconnect = useCallback(() => {
    if (!enabledRef.current || !urlRef.current || document.visibilityState === 'hidden') {
      return;
    }

    clearReconnectTimer();
    const delays = delaysRef.current.length > 0 ? delaysRef.current : DEFAULT_RECONNECT_DELAYS_MS;
    const delay = delays[Math.min(attemptRef.current, delays.length - 1)];
    attemptRef.current = Math.min(attemptRef.current + 1, delays.length - 1);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      connectRef.current();
    }, delay);
  }, [clearReconnectTimer]);

  connectRef.current = connect;
  scheduleReconnectRef.current = scheduleReconnect;

  useEffect(() => {
    urlRef.current = url;
    enabledRef.current = enabled;
    reconnect();
    return close;
  }, [close, enabled, reconnect, url]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabledRef.current && urlRef.current && !sourceRef.current) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reconnect]);

  return { reconnect };
}
