import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'Europe/Berlin' });

test('home refreshes schedule and last irrigation without reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-04-26T10:00:00+02:00') });

  let scheduleRequests = 0;
  let lastIrrigationRequests = 0;

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

  await page.route('**/api/et0/yesterday', async (route) => {
    await route.fulfill({ json: { date: '2026-04-25', et0mm: 2.1, unit: 'mm' } });
  });

  await page.route('**/api/weather/latest', async (route) => {
    await route.fulfill({
      json: {
        latest: {
          temperatureC: 18.4,
          humidity: 61,
          rainRateMmPerHour: 0,
          timestamp: '2026-04-26T07:58:00.000Z',
        },
        aggregates: {
          timestamp: '2026-04-26T07:55:00.000Z',
          meansTimestamp: '2026-04-26T00:10:00.000Z',
        },
      },
    });
  });

  await page.route('**/api/clouds/current', async (route) => {
    await route.fulfill({ json: { cloud: 25 } });
  });

  await page.route('**/api/countdown/currentCountdowns', async (route) => {
    await route.fulfill({ json: {} });
  });

  await page.route('**/api/schedule/next', async (route) => {
    scheduleRequests += 1;
    const nextTimestamp = scheduleRequests === 1
      ? '2026-04-27T04:30:00.000Z'
      : '2026-04-28T05:45:00.000Z';

    await route.fulfill({
      json: {
        nextScheduled: 'Scheduled',
        zone: scheduleRequests === 1 ? 'Stefan Nord' : 'Lukas West',
        nextTimestamp,
        inSeason: true,
      },
    });
  });

  await page.route('**/api/irrigation/last', async (route) => {
    lastIrrigationRequests += 1;
    const last = lastIrrigationRequests === 1
      ? {
          timestamp: '2026-04-25T06:00:00.000Z',
          zone: 'stefanNord',
          zoneLabel: 'Stefan Nord',
        }
      : {
          timestamp: '2026-04-26T06:30:00.000Z',
          zone: 'lukasWest',
          zoneLabel: 'Lukas West',
        };

    await route.fulfill({ json: { last } });
  });

  await page.goto('/');

  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', { name: 'Villa Anna Bewässerungssystem' })
  ).toBeVisible();
  await expect(main.getByText('27.04., 06:30')).toBeVisible();
  await expect(main.getByText(/25\.04\.2026, 08:00.*Stefan Nord/)).toBeVisible();

  await page.clock.fastForward(61_000);

  await expect(main.getByText('28.04., 07:45')).toBeVisible();
  await expect(main.getByText(/26\.04\.2026, 08:30.*Lukas West/)).toBeVisible();
});
