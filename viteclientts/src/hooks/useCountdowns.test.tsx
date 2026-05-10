// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countdownsQueryKey, useCountdowns } from './useCountdowns';

const socketMockState = vi.hoisted(() => {
  type Handler = (payload?: unknown) => void;
  type MockSocket = {
    handlers: Map<string, Handler>;
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    removeAllListeners: ReturnType<typeof vi.fn>;
    connected: boolean;
    emitServer: (event: string, payload?: unknown) => void;
  };

  const sockets: MockSocket[] = [];
  const io = vi.fn(() => {
    const handlers = new Map<string, Handler>();
    const socket: MockSocket = {
      handlers,
      on: vi.fn((event: string, handler: Handler) => {
        handlers.set(event, handler);
        return socket;
      }),
      close: vi.fn(() => {
        socket.connected = false;
      }),
      connect: vi.fn(() => {
        socket.connected = true;
        handlers.get('connect')?.();
        return socket;
      }),
      removeAllListeners: vi.fn(() => {
        handlers.clear();
        return socket;
      }),
      connected: false,
      emitServer: (event: string, payload?: unknown) => {
        handlers.get(event)?.(payload);
      },
    };

    sockets.push(socket);
    return socket;
  });

  return { io, sockets };
});

vi.mock('socket.io-client', () => ({ io: socketMockState.io }));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useCountdowns', () => {
  let visibilitySpy: ReturnType<typeof vi.spyOn>;
  let onlineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    socketMockState.io.mockClear();
    socketMockState.sockets.length = 0;
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get');
    visibilitySpy.mockReturnValue('visible');
    onlineSpy = vi.spyOn(navigator, 'onLine', 'get');
    onlineSpy.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches once initially and ticks active countdowns locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'bewaesserung/switch/stefanNord/set': {
          value: 3,
          hours: '0',
          minutes: '1',
          control: 'start',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { queryClient, wrapper } = createWrapper();

    renderHook(() => useCountdowns('/api'), { wrapper });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/countdown/currentCountdowns');
    expect(socketMockState.io).toHaveBeenCalledWith({
      autoConnect: false,
      reconnection: false,
      transports: ['websocket'],
      withCredentials: true,
    });
    expect(socketMockState.sockets[0].connect).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(countdownsQueryKey)).toEqual({
      'bewaesserung/switch/stefanNord/set': {
        value: 1,
        hours: '0',
        minutes: '1',
        control: 'start',
      },
    });
  });

  it('applies socket countdown updates as server truth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'bewaesserung/switch/stefanNord/set': {
          value: 0,
          hours: '0',
          minutes: '0',
          control: 'reset',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { queryClient, wrapper } = createWrapper();

    renderHook(() => useCountdowns('/api'), { wrapper });

    await flushPromises();

    expect(socketMockState.sockets).toHaveLength(1);

    act(() => {
      socketMockState.sockets[0].emitServer('redis-countdown-update', {
        topic: 'bewaesserung/switch/stefanNord/set',
        countdownValue: 42,
        countdownHours: '0',
        countdownMinutes: '1',
        countdownControl: 'start',
      });
    });

    expect(queryClient.getQueryData(countdownsQueryKey)).toEqual({
      'bewaesserung/switch/stefanNord/set': {
        value: 42,
        hours: '0',
        minutes: '1',
        control: 'start',
      },
    });
  });

  it('closes the socket while hidden and reconnects after becoming visible', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = createWrapper();

    renderHook(() => useCountdowns('/api'), { wrapper });
    await flushPromises();

    expect(socketMockState.sockets).toHaveLength(1);

    visibilitySpy.mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(socketMockState.sockets[0].close).toHaveBeenCalledTimes(1);

    visibilitySpy.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(999);
    });

    expect(socketMockState.sockets).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(socketMockState.sockets).toHaveLength(2);
    expect(socketMockState.sockets[1].connect).toHaveBeenCalledTimes(1);
  });

  it('closes while offline and reconnects when online again', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = createWrapper();

    renderHook(() => useCountdowns('/api'), { wrapper });
    await flushPromises();

    expect(socketMockState.sockets).toHaveLength(1);

    onlineSpy.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(socketMockState.sockets[0].close).toHaveBeenCalledTimes(1);

    onlineSpy.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(1000);
    });

    expect(socketMockState.sockets).toHaveLength(2);
    expect(socketMockState.sockets[1].connect).toHaveBeenCalledTimes(1);
  });

  it('cleans up a failed socket before reconnecting with backoff', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = createWrapper();

    renderHook(() => useCountdowns('/api'), { wrapper });
    await flushPromises();

    act(() => {
      socketMockState.sockets[0].emitServer('disconnect', 'transport close');
      vi.advanceTimersByTime(999);
    });

    expect(socketMockState.sockets[0].removeAllListeners).toHaveBeenCalledTimes(1);
    expect(socketMockState.sockets[0].close).toHaveBeenCalledTimes(1);
    expect(socketMockState.sockets).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(socketMockState.sockets).toHaveLength(2);
    expect(socketMockState.sockets[1].connect).toHaveBeenCalledTimes(1);
  });
});
