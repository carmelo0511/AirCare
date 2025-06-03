const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockSend }) },
  PutCommand: jest.fn(),
  QueryCommand: jest.fn()
}));

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

describe('handler /geo/reverse', () => {
  beforeEach(() => {
    process.env.OPENWEATHER_APIKEY = 'dummy';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns data for valid lat/lon parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ name: 'Paris' }])
    });
    const event = { resource: '/geo/reverse', queryStringParameters: { lat: '1', lon: '2' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([{ name: 'Paris' }]);
  });

  test('returns error when lat or lon missing', async () => {
    const event = { resource: '/geo/reverse', queryStringParameters: { lat: '1' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/Missing 'lat' or 'lon' parameter/);
  });
});

describe('handler /air', () => {
  beforeEach(() => {
    process.env.OPENWEATHER_APIKEY = 'dummy';
    process.env.TABLE_NAME = 'AirTable';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns AQI data when city parameter provided', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([{ lat: 10, lon: 20 }]) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
        list: [{ main: { aqi: 2 }, components: { pm2_5: 5, pm10: 10 } }]
      }) });

    const event = { resource: '/air', queryStringParameters: { city: 'Berlin' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.aqi).toBe(2);
    expect(mockSend).toHaveBeenCalled();
  });

  test('returns error when required parameters missing', async () => {
    const event = { resource: '/air', queryStringParameters: {} };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/Missing 'city' or 'lat'\+'lon'/);
  });
});

describe('handler /history', () => {
  beforeEach(() => {
    process.env.OPENWEATHER_APIKEY = 'dummy';
    process.env.TABLE_NAME = 'AirTable';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns history for valid location parameter', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ aqi: 1 }] });
    const event = { resource: '/history', queryStringParameters: { location: '1,2' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.history).toEqual([{ aqi: 1 }]);
  });

  test('returns error when location parameter missing', async () => {
    const event = { resource: '/history', queryStringParameters: {} };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/Missing 'location' parameter/);
  });
});
