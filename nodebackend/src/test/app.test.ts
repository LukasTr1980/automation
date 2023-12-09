import puppeteer, { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

describe('Login Tests', () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
        browser = await puppeteer.launch({ headless: "new" });
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    test('Login with incorrect credentials should return 401', async () => {
        await page.goto('http://localhost:5173/');
        await page.type('#\\:r1\\:', 'wronguser');
        await page.type('#\\:r3\\:', 'wrongpassword');
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes('/api/login') && response.status() === 401),
            page.click('button.MuiButton-root')
        ]);
        expect(response.status()).toBe(401);
    });

    test('Login with correct credentials should succeed', async () => {
        await page.goto('http://localhost:5173/');
        await page.type('#\\:r1\\:', process.env.VALID_USERNAME!);
        await page.type('#\\:r3\\:', process.env.VALID_PASSWORD!);

        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes('/api/login')),
            page.waitForNavigation(), // Wait for navigation to complete after login
            page.click('button.MuiButton-root')
        ]);
        expect(response.status()).toBe(200); // Assuming 200 is the success status code
        expect(page.url()).toBe('http://localhost:5173/home');

        await page.waitForSelector('a[href="/villa-anna/home"]', { visible: true });

        // Click the link and wait for navigation to complete
        await Promise.all([
            page.waitForNavigation(), // Wait for navigation to complete after clicking the link
            page.click('a[href="/villa-anna/home"]') // Clicking the link
        ]);
        expect(page.url()).toBe('http://localhost:5173/villa-anna/home');

        await page.waitForSelector('a[href="/villa-anna/bewaesserung"]', { visible: true });

        await Promise.all([
            page.waitForNavigation(),
            page.click('a[href="/villa-anna/bewaesserung')
        ]);
        expect(page.url()).toBe('http://localhost:5173/villa-anna/bewaesserung');

        await page.waitForSelector('#switch-lukas-west-3', { visible: true });

        const isInitiallyToggled = await page.$eval('span[aria-label="Lukas West"]', el => el.classList.contains('Mui-checked'));
        
        await page.click('#switch-lukas-west-3');

        const isToggledAfterFirstClick = await page.$eval('span[aria-label="Lukas West"]', el => el.classList.contains('Mui-checked'));
        expect(isToggledAfterFirstClick).toBe(!isInitiallyToggled); // Expect the opposite of the initial state

        await page.waitForSelector('#switch-lukas-west-3', { visible: true });
        
        await page.click('#switch-lukas-west-3');
        
        const isToggledAfterSecondClick = await page.$eval('span[aria-label="Lukas West"]', el => el.classList.contains('Mui-checked'));
        expect(isToggledAfterSecondClick).toBe(isInitiallyToggled); // Expect it to return to the initial state             
    });
});
