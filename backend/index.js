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

// Lambda entry point
exports.handler = async (event) => {
  console.log("📥 Event raw:", JSON.stringify(event));

  // Retrieve OpenWeather API key from Lambda environment variables
  const APIKEY = process.env.OPENWEATHER_APIKEY;
  if (!APIKEY) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
      },
      body: JSON.stringify({ error: "Missing OPENWEATHER_APIKEY" })
    };
  }

  let statusCode = 200;
  let responseBody = {};

  try {
    // Determine endpoint path (supports API Gateway or Lambda Function URL)
    const path = event.resource || event.requestContext?.http?.path || event.path;
    const params = event.queryStringParameters || {};
    console.log("🔔 Path:", path);
    console.log("🔍 Parameters:", JSON.stringify(params));

    // --- GEO DIRECT: Get geocoding suggestions from OpenWeatherMap ---
    if (path.endsWith("/geo/direct")) {
      const { q, limit } = params;
      if (!q) throw new Error("Missing 'q' parameter");
      const apiUrl =
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}` +
        `&limit=${limit || 5}&appid=${APIKEY}`;
      console.log("🌐 Geo Direct URL:", apiUrl);
      const openRes = await fetch(apiUrl);
      if (!openRes.ok) throw new Error(openRes.statusText);
      responseBody = await openRes.json();
    }

    // --- GEO REVERSE: Get city name from coordinates ---
    else if (path.endsWith("/geo/reverse")) {
      const { lat, lon, limit } = params;
      if (!lat || !lon) throw new Error("Missing 'lat' or 'lon' parameter");
      const apiUrl =
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}` +
        `&limit=${limit || 1}&appid=${APIKEY}`;
      console.log("🌐 Geo Reverse URL:", apiUrl);
      const openRes = await fetch(apiUrl);
      if (!openRes.ok) throw new Error(openRes.statusText);
      responseBody = await openRes.json();
    }

    // --- AIR POLLUTION: Fetch AQI from OpenWeatherMap and store in DynamoDB ---
    else if (path.endsWith("/air")) {
      let latitude, longitude;
      const { city, lat, lon } = params;

      // Geocode by city name if provided, else use direct lat/lon
      if (city) {
        console.log("📍 Looking up city:", city);
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${APIKEY}`
        );
        if (!geoRes.ok) throw new Error(geoRes.statusText);
        const geoData = await geoRes.json();
        if (!geoData.length) throw new Error("City not found");
        latitude = geoData[0].lat;
        longitude = geoData[0].lon;
      } else {
        if (!lat || !lon) throw new Error("Missing 'city' or 'lat'+'lon'");
        latitude = lat;
        longitude = lon;
      }

      // Call OpenWeather Air Pollution API
      const apiUrl =
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${APIKEY}`;
      console.log("🌐 Air Pollution URL:", apiUrl);

      const openRes = await fetch(apiUrl);
      if (!openRes.ok) throw new Error(openRes.statusText);
      const aqiPayload = await openRes.json();
      console.log("✅ OpenWeather response:", aqiPayload);

      // Parse response for AQI and pollution components
      const record = aqiPayload.list && aqiPayload.list[0];
      if (!record) throw new Error("Could not retrieve AQI data");
      const aqiValue = record.main.aqi;
      const timestamp = new Date().toISOString();
      const locationKey = `${latitude},${longitude}`;

      // Prepare DynamoDB item (including custom AQI advice)
      const item = {
        location: locationKey,
        timestamp: timestamp,
        aqi: aqiValue,
        pm2_5: record.components.pm2_5,
        pm10: record.components.pm10,
        advice:
          aqiValue === 1
            ? "Good quality"
            : aqiValue === 2
            ? "Acceptable quality"
            : aqiValue === 3
            ? "Increased sensitivity"
            : aqiValue === 4
            ? "High pollution"
            : "Dangerous for health"
      };

      // Insert AQI data into DynamoDB
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

      // Respond to frontend
      responseBody = {
        location: locationKey,
        timestamp: timestamp,
        aqi: aqiValue,
        advice: item.advice,
        components: record.components
      };
    }

    // --- HISTORY: Retrieve AQI history from DynamoDB for a given location ---
    else if (path.endsWith("/history")) {
      const { location } = params;
      if (!location) throw new Error("Missing 'location' parameter");

      let items;
      try {
        const result = await ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            // Use alias (#loc) to avoid attribute name conflicts; 'location' isn't reserved
            KeyConditionExpression: "#loc = :locValue",
            ExpressionAttributeNames: {
              "#loc": "location"
            },
            ExpressionAttributeValues: {
              ":locValue": location
            },
            ScanIndexForward: true // Ascending order (oldest to newest)
          })
        );
        items = result.Items || [];
        console.log(
          `📚 Found ${items.length} items for location=${location}`
        );
      } catch (queryErr) {
        console.error("❌ DynamoDB Query error:", queryErr);
        throw new Error("DynamoDB history read failed: " + queryErr.message);
      }

      responseBody = {
        location: location,
        history: items
      };
    }

    // --- UNKNOWN ENDPOINT ---
    else {
      throw new Error("Unknown endpoint: " + path);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    statusCode = 400;
    responseBody = { error: err.message };
  }

  // --- Standard API Gateway/Lambda proxy response with CORS headers ---
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,GET"
    },
    body: JSON.stringify(responseBody)
  };
};
