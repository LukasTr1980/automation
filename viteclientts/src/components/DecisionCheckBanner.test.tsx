// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DecisionCheckBanner from './DecisionCheckBanner';

function renderBanner() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DecisionCheckBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DecisionCheckBanner', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the global warning and navigation link when checks are skipped', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ skip: true }),
    } as Response);

    renderBanner();

    expect(await screen.findByText('Entscheidungsprüfung deaktiviert')).toBeTruthy();
    expect(screen.getByText(/ohne Prüfung von Wetter und Wasserreserve/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Zur Bewässerung' }).getAttribute('href')).toBe('/bewaesserung');
  });

  it('renders no banner when checks are active', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ skip: false }),
    } as Response);

    renderBanner();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText('Entscheidungsprüfung deaktiviert')).toBeNull();
  });

  it('shows an unknown-state error when the status request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    renderBanner();

    expect(await screen.findByText('Status der Entscheidungsprüfung unbekannt')).toBeTruthy();
  });
});
