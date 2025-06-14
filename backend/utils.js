const ADVICE_MAP = {
  1: "Good quality",
  2: "Acceptable quality",
  3: "Increased sensitivity",
  4: "High pollution",
  5: "Dangerous for health",
};

function getAdvice(aqi) {
  return ADVICE_MAP[aqi] || "Unknown";
}

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
    },
    body: JSON.stringify(body),
  };
}

async function fetchJsonWithEnglish(url) {
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function normalizeCoordinate(value) {
  return Number(parseFloat(value).toFixed(2));
}

// Retrieve the OpenWeatherMap API key from environment variables
function getApiKey() {
  return process.env.OPENWEATHER_APIKEY || process.env.API_KEY;
}

module.exports = {
  getAdvice,
  buildResponse,
  fetchJsonWithEnglish,
  normalizeCoordinate,
  getApiKey,
};
