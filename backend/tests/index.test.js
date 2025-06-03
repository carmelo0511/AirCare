const { handler } = require('../index');

describe('handler /geo/direct', () => {
  beforeEach(() => {
    process.env.OPENWEATHER_APIKEY = 'dummy';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns data for valid q parameter', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ name: 'London' }])
    });
    const event = { resource: '/geo/direct', queryStringParameters: { q: 'London' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([{ name: 'London' }]);
  });

  test('returns error when q parameter missing', async () => {
    const event = { resource: '/geo/direct', queryStringParameters: {} };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/Missing 'q' parameter/);
  });

  test('returns 500 when API key missing', async () => {
    delete process.env.OPENWEATHER_APIKEY;
    const event = { resource: '/geo/direct', queryStringParameters: { q: 'London' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/OPENWEATHER_APIKEY/);
  });

  test('returns error when OpenWeather responds with failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, statusText: 'Bad Request', json: jest.fn() });
    const event = { resource: '/geo/direct', queryStringParameters: { q: 'Paris' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/Bad Request/);
  });
});
