// index.js — Lambda AirCare with AWS SDK V3 (Node.js 18.x)
// Uses CommonJS, compatible with the Node.js 18.x Lambda runtime.
// The Node.js 18.x runtime provides fetch() globally.

// --- Import AWS SDK V3 clients and commands for DynamoDB ---
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");

// Instantiate DynamoDB client (region is auto-detected in Lambda)
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// DynamoDB table name from Lambda environment variable (default fallback)
const TABLE_NAME = process.env.TABLE_NAME || "AirCareHistoryAQI";

// Map of AQI values to health advice strings
const ADVICE_MAP = {
  1: "Good quality",
  2: "Acceptable quality",
  3: "Increased sensitivity",
  4: "High pollution",
  5: "Dangerous for health"
};

function getAdvice(aqi) {
  return ADVICE_MAP[aqi] || "Unknown";
}

// Build a standard API Gateway response with CORS headers
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,GET"
    },
    body: JSON.stringify(body)
  };
}

// Helper to fetch JSON from OpenWeatherMap with English responses
async function fetchJsonWithEnglish(url) {
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// --- Endpoint handlers ---
async function handleGeoDirect(params, APIKEY) {
  const { q, limit } = params;
  if (!q) throw new Error("Missing 'q' parameter");
  const apiUrl =
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}` +
    `&limit=${limit || 5}&lang=en&appid=${APIKEY}`;
  console.log("🌐 Geo Direct URL:", apiUrl);
  return fetchJsonWithEnglish(apiUrl);
}

async function handleGeoReverse(params, APIKEY) {
  const { lat, lon, limit } = params;
  if (!lat || !lon) throw new Error("Missing 'lat' or 'lon' parameter");
  const apiUrl =
    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}` +
    `&limit=${limit || 1}&lang=en&appid=${APIKEY}`;
  console.log("🌐 Geo Reverse URL:", apiUrl);
  return fetchJsonWithEnglish(apiUrl);
}

async function handleAir(params, APIKEY) {
  const { userId } = params;
  let latitude, longitude;
  const { city, lat, lon } = params;

  if (city) {
    console.log("📍 Looking up city:", city);
    const geoData = await fetchJsonWithEnglish(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&lang=en&appid=${APIKEY}`
    );
    if (!geoData.length) throw new Error("City not found");
    latitude = geoData[0].lat;
    longitude = geoData[0].lon;
  } else {
    if (!lat || !lon) throw new Error("Missing 'city' or 'lat'+'lon'");
    latitude = lat;
    longitude = lon;
  }

  latitude = Number(parseFloat(latitude).toFixed(2));
  longitude = Number(parseFloat(longitude).toFixed(2));

  const apiUrl =
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&lang=en&appid=${APIKEY}`;
  console.log("🌐 Air Pollution URL:", apiUrl);

  const aqiPayload = await fetchJsonWithEnglish(apiUrl);
  console.log("✅ OpenWeather response:", aqiPayload);

  const record = aqiPayload.list && aqiPayload.list[0];
  if (!record) throw new Error("Could not retrieve AQI data");
  const aqiValue = record.main.aqi;
  const timestamp = new Date().toISOString();
  const locationKey = `${latitude},${longitude}`;

  const item = {
    location: locationKey,
    timestamp: timestamp,
    aqi: aqiValue,
    pm2_5: record.components.pm2_5,
    pm10: record.components.pm10,
    advice: getAdvice(aqiValue),
    ...(userId ? { userId } : {})
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );
    console.log("🗄️ Inserted item into DynamoDB:", item);
  } catch (ddbErr) {
    console.error("❌ DynamoDB PutItem error:", ddbErr);
    throw new Error("DynamoDB write failed: " + ddbErr.message);
  }

  return {
    location: locationKey,
    timestamp: timestamp,
    aqi: aqiValue,
    advice: item.advice,
    components: record.components
  };
}

async function handleHistory(params) {
  const { location, userId } = params;
  if (!location) throw new Error("Missing 'location' parameter");
  let locValue = decodeURIComponent(location);
  if (/^[-\d.]+,[-\d.]+$/.test(locValue)) {
    const [latStr, lonStr] = locValue.split(',');
    const normLat = Number(parseFloat(latStr).toFixed(2));
    const normLon = Number(parseFloat(lonStr).toFixed(2));
    locValue = `${normLat},${normLon}`;
  }

  let items;
  try {
    const queryInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "#loc = :locValue",
      ExpressionAttributeNames: { "#loc": "location" },
      ExpressionAttributeValues: { ":locValue": locValue },
      ScanIndexForward: true,
      ConsistentRead: true
    };
    if (userId) {
      queryInput.FilterExpression = "#user = :userId";
      queryInput.ExpressionAttributeNames["#user"] = "userId";
      queryInput.ExpressionAttributeValues[":userId"] = userId;
    }
    const result = await ddb.send(new QueryCommand(queryInput));
    items = result.Items || [];
    console.log(`📚 Found ${items.length} items for location=${locValue}`);
  } catch (queryErr) {
    console.error("❌ DynamoDB Query error:", queryErr);
    throw new Error("DynamoDB history read failed: " + queryErr.message);
  }

  return {
    location: locValue,
    history: items.map((it) => ({
      ...it,
      advice: getAdvice(it.aqi)
    }))
  };
}

// Lambda entry point
exports.handler = async (event) => {
  console.log("📥 Event raw:", JSON.stringify(event));

  const APIKEY = process.env.OPENWEATHER_APIKEY;
  if (!APIKEY) {
    return buildResponse(500, { error: "Missing OPENWEATHER_APIKEY" });
  }

  const path = event.resource || event.requestContext?.http?.path || event.path;
  const params = event.queryStringParameters || {};
  console.log("🔔 Path:", path);
  console.log("🔍 Parameters:", JSON.stringify(params));

  const handlers = {
    "/geo/direct": (p) => handleGeoDirect(p, APIKEY),
    "/geo/reverse": (p) => handleGeoReverse(p, APIKEY),
    "/air": (p) => handleAir(p, APIKEY),
    "/history": (p) => handleHistory(p)
  };

  try {
    const match = Object.keys(handlers).find((key) => path.endsWith(key));
    if (!match) return buildResponse(404, { error: "Unknown endpoint: " + path });
    const data = await handlers[match](params);
    return buildResponse(200, data);
  } catch (err) {
    console.error("❌ Error:", err);
    return buildResponse(400, { error: err.message });
  }
};
