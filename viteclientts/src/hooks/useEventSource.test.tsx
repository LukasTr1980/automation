// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventSource } from './useEventSource';

class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  close = vi.fn();

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  emitError(): void {
    this.onerror?.(new Event('error'));
  }

  emitMessage(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  emitOpen(): void {
    this.onopen?.();
  }
}

describe('useEventSource', () => {
  const originalEventSource = window.EventSource;
  let visibilitySpy: ReturnType<typeof vi.spyOn>;
  let onlineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    window.EventSource = MockEventSource as unknown as typeof EventSource;
    visibilitySpy = vi.spyOn(document, 'visibilityState', 'get');
    visibilitySpy.mockReturnValue('visible');
    onlineSpy = vi.spyOn(navigator, 'onLine', 'get');
    onlineSpy.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.EventSource = originalEventSource;
  });

  it('opens the stream and forwards messages to the caller', () => {
    const onMessage = vi.fn();

    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage }));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/mqtt');

    act(() => {
      MockEventSource.instances[0].emitMessage('{"type":"switchState"}');
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].data).toBe('{"type":"switchState"}');
  });

  it('closes a failed stream and reconnects with backoff', () => {
    const onError = vi.fn();

    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage: vi.fn(), onError }));
    const firstStream = MockEventSource.instances[0];

    act(() => {
      firstStream.emitError();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(firstStream.close).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].url).toBe('/api/mqtt');
  });

  it('does not reconnect while hidden and reconnects when visible again', () => {
    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage: vi.fn() }));
    const firstStream = MockEventSource.instances[0];

    visibilitySpy.mockReturnValue('hidden');
    act(() => {
      firstStream.emitError();
      vi.advanceTimersByTime(30_000);
    });

    expect(MockEventSource.instances).toHaveLength(1);

    visibilitySpy.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('closes the stream when the document becomes hidden', () => {
    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage: vi.fn() }));
    const firstStream = MockEventSource.instances[0];

    visibilitySpy.mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(firstStream.close).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances).toHaveLength(1);

    visibilitySpy.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('closes for page lifecycle suspension and reconnects on pageshow', () => {
    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage: vi.fn() }));
    const firstStream = MockEventSource.instances[0];

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(firstStream.close).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('closes while offline and reconnects when online again', () => {
    renderHook(() => useEventSource({ url: '/api/mqtt', onMessage: vi.fn() }));
    const firstStream = MockEventSource.instances[0];

    onlineSpy.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
      firstStream.emitError();
      vi.advanceTimersByTime(30_000);
    });

    expect(firstStream.close).toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(1);

    onlineSpy.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });
});
