import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'Europe/Berlin' });

async function installDashboardMocks(page: Page, skipDecision: boolean) {
  await page.clock.install({ time: new Date('2026-07-24T14:00:00+02:00') });

  await page.addInitScript(() => {
    class MockEventSource extends EventTarget {
      url: string;
      withCredentials = false;
      readyState = 1;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(url: string) {
        super();
        this.url = url;
        setTimeout(() => {
          this.onopen?.(new Event('open'));
          this.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'irrigationNeeded',
              state: false,
              response: {
                outTemp: 18.2,
                humidity: 55,
                rainToday: 0,
                rainRate: 0,
                rainTodayForecast: 0,
                rainProbTodayForecast: 0,
                rainNextDay: 0,
                rainProbNextDay: 0,
                effectiveForecastToday: 0,
                effectiveForecast: 0,
                soilStorageMm: 17.3,
                tawMm: 30,
                depletionMm: 12.7,
                triggerMm: 15,
                soilUpdatedAt: '2026-07-24T01:05:00.000Z',
                blockers: ['Boden nicht trocken genug: Entzug < 15.0 mm (aktuell 12.7 mm)'],
              },
            }),
          }));
        }, 0);
      }

      close() {
        this.readyState = 2;
      }
    }

    Object.defineProperty(window, 'EventSource', {
      value: MockEventSource,
      writable: true,
    });
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === '/api/decisionCheck') {
      await route.fulfill({ json: { skip: skipDecision } });
      return;
    }
    if (path === '/api/weather/latest') {
      await route.fulfill({
        json: {
          latest: {
            temperatureC: 24.6,
            humidity: 55,
            rainRateMmPerHour: 0,
            observedAt: '2026-07-24T11:59:00.000Z',
            timestamp: '2026-07-24T11:59:00.000Z',
            stale: false,
          },
          aggregates: {
            timestamp: '2026-07-24T11:55:00.000Z',
            meansTimestamp: '2026-07-24T00:35:00.000Z',
          },
        },
      });
      return;
    }
    if (path === '/api/schedule/next') {
      await route.fulfill({
        json: {
          nextScheduled: '21:00',
          zone: 'Stefan Nord',
          nextTimestamp: '2026-07-24T19:00:00.000Z',
          inSeason: true,
          nextIrrigation: {
            status: skipDecision ? 'planned' : 'blocked',
            reasonKey: skipDecision ? 'decision_check_disabled' : 'soil_wet',
            blockerCount: 1,
            nextTimestamp: '2026-07-24T19:00:00.000Z',
            zone: 'Stefan Nord',
            decisionCheckSkipped: skipDecision,
          },
        },
      });
      return;
    }
    if (path === '/api/soil-bucket') {
      await route.fulfill({
        json: {
          zone: 'lukasSued',
          soilStorageMm: 17.3,
          tawMm: 30,
          depletionMm: 12.7,
          updatedAt: '2026-07-24T01:05:00.000Z',
        },
      });
      return;
    }
    if (path === '/api/et0/yesterday') {
      await route.fulfill({ json: { date: '2026-07-23', et0mm: null, unit: 'mm' } });
      return;
    }
    if (path === '/api/irrigation/last') {
      await route.fulfill({ json: { last: null } });
      return;
    }
    if (path === '/api/irrigation/depth-calibration') {
      await route.fulfill({
        json: {
          source: 'cup-test',
          mmPerMin: 2 / 15,
          defaultDurationMin: 15,
          defaultDepthMm: 2,
          scheduled: { runs: [], averageDepthMm: 2 },
        },
      });
      return;
    }
    if (path === '/api/radiation/current') {
      await route.fulfill({
        json: {
          globalRadiationWM2: 920,
          stationName: 'Völs am Schlern',
          timestamp: '2026-07-24T11:50:00.000Z',
          stale: false,
        },
      });
      return;
    }
    if (path === '/api/scheduledTasks' || path === '/api/countdown/currentCountdowns') {
      await route.fulfill({ json: {} });
      return;
    }
    if (path === '/api/getTaskEnabler') {
      await route.fulfill({ json: { state: true } });
      return;
    }

    await route.fulfill({ json: {} });
  });
}

test('shows planned irrigation and ignored conditions when decision checks are skipped', async ({ page }) => {
  await installDashboardMocks(page, true);
  await page.goto('/');

  const main = page.getByRole('main');
  await expect(main.getByText('Entscheidungsprüfung deaktiviert', { exact: true })).toBeVisible();
  await expect(main.getByText('Ignorierte Bedingungen', { exact: true })).toBeVisible();
  await expect(main.getByText('Noch genug Wasser', { exact: true })).toBeVisible();
  await expect(main.getByText('Heute, 21:00 Uhr', { exact: true })).toBeVisible();
  await expect(main.getByText('Stefan Nord · ohne Prüfung', { exact: true })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Navigation' })
    .getByRole('link', { name: 'Timer' })
    .click();
  await expect(page.getByRole('main').getByText('Entscheidungsprüfung deaktiviert', { exact: true })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Navigation' })
    .getByRole('link', { name: 'Bewässerung' })
    .click();
  await expect(page.getByRole('main').getByText('Entscheidungsprüfung deaktiviert', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('main').getByText('Ignorierte Bedingungen', { exact: true })).toBeVisible();
});

test('keeps the blocking presentation when decision checks are active', async ({ page }) => {
  await installDashboardMocks(page, false);
  await page.goto('/');

  const main = page.getByRole('main');
  await expect(main.getByText('Pausiert', { exact: true })).toBeVisible();
  await expect(main.getByText('Boden noch feucht', { exact: true })).toBeVisible();
  await expect(main.getByText('Entscheidungsprüfung deaktiviert', { exact: true })).toHaveCount(0);
  await expect(main.getByText('Blocker', { exact: true })).toBeVisible();
});
