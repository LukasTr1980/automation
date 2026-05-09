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
      close: vi.fn(),
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
  beforeEach(() => {
    vi.useFakeTimers();
    socketMockState.io.mockClear();
    socketMockState.sockets.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
});
