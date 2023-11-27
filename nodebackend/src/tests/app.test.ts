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
            page.click('button.MuiButton-root')
        ]);
        expect(response.status()).toBe(200); // Assuming 200 is the success status code
    });
});
