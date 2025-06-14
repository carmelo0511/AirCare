const http = require('http-server');
const path = require('path');
const puppeteer = require('puppeteer');
jest.setTimeout(10000);

describe('AirCare frontend', () => {
  let server;
  let browser;
  beforeAll(async () => {
    server = http.createServer({ root: path.join(__dirname, '..') });
    await new Promise(r => server.listen(8081, r));
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    server.close();
  });

  test('loads main page', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:8081/index.html');
    const title = await page.title();
    expect(title).toMatch(/AirCare/);
  });
});
