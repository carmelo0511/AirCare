// index.js — Lambda AirCare avec AWS SDK V3 (Node.js 18.x)
// Utilise CommonJS, compatible avec le runtime Node.js 18.x de Lambda.

// Le runtime Node.js 18.x fournit déjà fetch() globalement.

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");

// Instanciation du client DynamoDB V3.
// La région sera automatiquement détectée depuis l’environnement Lambda.
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// Nom de la table, défini dans les variables d’environnement de la Lambda.
const TABLE_NAME = process.env.TABLE_NAME || "AirCareHistoryAQI";

exports.handler = async (event) => {
  console.log("📥 Event raw:", JSON.stringify(event));

  const APIKEY = process.env.OPENWEATHER_APIKEY;
  let statusCode = 200;
  let responseBody = {};

  try {
    // Détermination du chemin (API Gateway ou Function URL)
    const path = event.resource || event.requestContext?.http?.path || event.path;
    const params = event.queryStringParameters || {};
    console.log("🔔 Path:", path);
    console.log("🔍 Parameters:", JSON.stringify(params));

    // ── GEO DIRECT ──
    if (path.endsWith("/geo/direct")) {
      const { q, limit } = params;
      if (!q) throw new Error("Missing 'q' parameter");
      const apiUrl =
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}` +
        `&limit=${limit || 5}&appid=${APIKEY}`;
      console.log("🌐 Geo Direct URL:", apiUrl);
      const openRes = await fetch(apiUrl);
      responseBody = await openRes.json();
    }
    // ── GEO REVERSE ──
    else if (path.endsWith("/geo/reverse")) {
      const { lat, lon, limit } = params;
      if (!lat || !lon) throw new Error("Missing 'lat' or 'lon' parameter");
      const apiUrl =
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}` +
        `&limit=${limit || 1}&appid=${APIKEY}`;
      console.log("🌐 Geo Reverse URL:", apiUrl);
      const openRes = await fetch(apiUrl);
      responseBody = await openRes.json();
    }
    // ── AIR POLLUTION (enregistrement dans DynamoDB) ──
    else if (path.endsWith("/air")) {
      let latitude, longitude;
      const { city, lat, lon } = params;

      // Géocodage par ville ou direct via lat+lon
      if (city) {
        console.log("📍 Looking up city:", city);
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${APIKEY}`
        );
        const geoData = await geoRes.json();
        if (!geoData.length) throw new Error("City not found");
        latitude = geoData[0].lat;
        longitude = geoData[0].lon;
      } else {
        if (!lat || !lon) throw new Error("Missing 'city' or 'lat'+'lon'");
        latitude = lat;
        longitude = lon;
      }

      // Appel à l’API Air Pollution d’OpenWeather
      const apiUrl =
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${APIKEY}`;
      console.log("🌐 Air Pollution URL:", apiUrl);

      const openRes = await fetch(apiUrl);
      const aqiPayload = await openRes.json();
      console.log("✅ OpenWeather response:", aqiPayload);

      const record = aqiPayload.list && aqiPayload.list[0];
      if (!record) throw new Error("Impossible de récupérer les données AQI");
      const aqiValue = record.main.aqi;
      const timestamp = new Date().toISOString();
      const locationKey = `${latitude},${longitude}`;

      // Préparation de l’item à insérer dans DynamoDB
      const item = {
        location: locationKey,
        timestamp: timestamp,
        aqi: aqiValue,
        pm2_5: record.components.pm2_5,
        pm10: record.components.pm10,
        advice:
          aqiValue === 1
            ? "Bonne qualité"
            : aqiValue === 2
            ? "Qualité acceptable"
            : aqiValue === 3
            ? "Sensibilité accrue"
            : aqiValue === 4
            ? "Pollution élevée"
            : "Danger pour la santé"
      };

      // Insertion dans DynamoDB avec AWS SDK V3
      try {
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: item
          })
        );
        console.log("🗄️ Inserted item into DynamoDB:", item);
      } catch (ddbErr) {
        console.error("❌ Erreur DynamoDB PutItem:", ddbErr);
        throw new Error("Échec enregistrement DynamoDB: " + ddbErr.message);
      }

      // Réponse au frontend
      responseBody = {
        location: locationKey,
        timestamp: timestamp,
        aqi: aqiValue,
        advice: item.advice,
        components: record.components
      };
    }
    // ── HISTORIQUE AQI (lecture) ──
    else if (path.endsWith("/history")) {
      const { location } = params;
      if (!location) throw new Error("Paramètre 'location' manquant");

      let items;
      try {
        const result = await ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            // Utiliser un alias (#loc) car "location" est mot réservé
            KeyConditionExpression: "#loc = :locValue",
            ExpressionAttributeNames: {
              "#loc": "location"
            },
            ExpressionAttributeValues: {
              ":locValue": location
            },
            ScanIndexForward: true // tri ascendant
          })
        );
        items = result.Items;
        console.log(`📚 Found ${items.length} items for location=${location}`);
      } catch (queryErr) {
        console.error("❌ Erreur DynamoDB Query:", queryErr);
        throw new Error("Échec lecture historique DynamoDB: " + queryErr.message);
      }

      responseBody = {
        location: location,
        history: items
      };
    }
    // ── ENDPOINT INCONNU ──
    else {
      throw new Error("Unknown endpoint: " + path);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    statusCode = 400;
    responseBody = { error: err.message };
  }

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
