// === AirCare Frontend Main Script ===

// API base URL is provided by config.js so deployments can change the
// backend endpoint without modifying this file.
import { API_BASE_URL } from './config.js';
const apiBaseUrl = API_BASE_URL;

// --- DOM elements ---
const fetchBtn = document.getElementById('fetchBtn');
const geoBtn = document.getElementById('geoBtn');
const cityInput = document.getElementById('cityInput');
const citySuggestions = document.getElementById('citySuggestions');
const loader = document.getElementById('loader');
const result = document.getElementById('result');
const errorMsg = document.getElementById('errorMsg');
const locationDisplay = document.getElementById('location');
const qualityDisplay = document.getElementById('quality');
const recommendation = document.getElementById('recommendation');
const emojiDisplay = document.getElementById('emoji');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const themeToggle = document.getElementById('themeToggle');

// Used for debouncing autocomplete requests
let debounceTimeout = null;

// AQI Mapping: associates each AQI level (1-5) to a label, color, emoji, and health advice.
const AQI_MAP = [
  { label: "Excellent", color: "text-green-600", emoji: "🟢", advice: "Fresh air, enjoy it!" },
  { label: "Good", color: "text-green-500", emoji: "😊", advice: "No issues for asthmatics." },
  { label: "Moderate", color: "text-yellow-600", emoji: "😐", advice: "Avoid prolonged exertion if sensitive." },
  { label: "Poor", color: "text-orange-600", emoji: "😷", advice: "Limit outdoor activities and monitor symptoms." },
  { label: "Very poor", color: "text-red-600", emoji: "🚨", advice: "Stay indoors and follow your treatment!" }
];

// --- Data helpers ---
const roundCoord = (v) => Number(parseFloat(v).toFixed(2));

async function fetchAirData(lat, lon) {
  const res = await fetch(`${apiBaseUrl}/air?lat=${lat}&lon=${lon}`);
  return res.json();
}

async function fetchHistoryData(lat, lon) {
  const res = await fetch(`${apiBaseUrl}/history?location=${encodeURIComponent(lat + ',' + lon)}`);
  return res.json();
}

function renderAirInfo(cityLabel, aqi) {
  const info = AQI_MAP[aqi - 1];
  locationDisplay.textContent = cityLabel;
  qualityDisplay.textContent = `Air quality: ${info.label}`;
  qualityDisplay.className = `text-lg font-semibold ${info.color}`;
  recommendation.innerHTML = `<b>Advice:</b> ${info.advice}`;
  emojiDisplay.textContent = info.emoji;
  showResult(true);
}

function renderHistory(history) {
  historyList.innerHTML = "";
  if (history && history.length) {
    const sorted = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sorted.slice(0, 5).forEach(item => {
      const date = new Date(item.timestamp);
      const li = document.createElement("li");
      li.textContent = `${date.toLocaleString('en-US')} → AQI ${item.aqi} (${item.advice})`;
      historyList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No history available for this location.";
    historyList.appendChild(li);
  }
  showHistory(true);
}

// --- UI helper functions ---

// Shows or hides the loader spinner
function showLoader(show) {
  loader.classList.toggle('hidden', !show);
}
// Shows or hides the main result block
function showResult(show) {
  result.classList.toggle('hidden', !show);
}
// Displays an error message (or hides if empty)
function showError(msg = "") {
  errorMsg.textContent = msg;
  errorMsg.classList.toggle('hidden', !msg);
}
// Shows or hides the AQI history section
function showHistory(show) {
  historySection.classList.toggle('hidden', !show);
}

// --- Theme toggle ---
function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  themeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
}

function setTheme(mode) {
  applyTheme(mode);
  localStorage.setItem('theme', mode);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
  });
  initTheme();
}

// --- City Autocomplete Logic ---

cityInput.addEventListener('input', () => {
  // Handles real-time autocomplete as the user types in the city input
  const query = cityInput.value.trim();
  citySuggestions.innerHTML = '';
  citySuggestions.classList.add('hidden');
  if (!query || query.length < 2) return;

  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    try {
      // Calls the /geo/direct endpoint to fetch city suggestions
      const res = await fetch(`${apiBaseUrl}/geo/direct?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (!data.length) return;

      // Renders suggestions as clickable <li> elements
      citySuggestions.innerHTML = data.map(city => {
        const label = city.local_names && city.local_names.en ? city.local_names.en : city.name;
        return `<li class="p-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-gray-600">${label}${city.state ? ', ' + city.state : ''}, ${city.country}</li>`;
      }).join('');
      citySuggestions.classList.remove('hidden');

      // Click on a suggestion fills the input and hides the dropdown
      Array.from(citySuggestions.children).forEach((li) => {
        li.addEventListener('click', () => {
          cityInput.value = li.textContent;
          citySuggestions.classList.add('hidden');
        });
      });
    } catch (err) {
      showError("Error: could not load");
    }
  }, 200); // Debounce delay for API requests
});

// Hides suggestions if you click outside the autocomplete dropdown
document.addEventListener('click', (e) => {
  if (!citySuggestions.contains(e.target) && e.target !== cityInput) {
    citySuggestions.classList.add('hidden');
  }
});

// --- Reverse Geocoding ---
// Resolves a pair of coordinates (lat, lon) to a city name, using the backend /geo/reverse endpoint.
async function getCityNameFromCoords(lat, lon) {
  try {
    const res = await fetch(`${apiBaseUrl}/geo/reverse?lat=${lat}&lon=${lon}&limit=1`);
    const data = await res.json();
    if (data && data[0]) {
      const name = data[0].local_names && data[0].local_names.en ? data[0].local_names.en : data[0].name;
      return `${name}, ${data[0].country}`;
    }
  } catch (e) { }
  return `Coordinates: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

// --- Fetch AQI and History for Coordinates ---
async function fetchAirAndHistory(lat, lon, locationLabel = null) {
  showLoader(true);
  showResult(false);
  showError("");
  showHistory(false);
  historyList.innerHTML = "";

  try {
    // 1. Get display name for the location
    let cityLabel = locationLabel;
    if (!cityLabel) {
      cityLabel = await getCityNameFromCoords(lat, lon);
    }

    const roundedLat = roundCoord(lat);
    const roundedLon = roundCoord(lon);

    const airData = await fetchAirData(roundedLat, roundedLon);
    if (!airData || airData.error) throw new Error(airData.error || "AQI data unavailable");
    renderAirInfo(cityLabel, airData.aqi);

    const histData = await fetchHistoryData(roundedLat, roundedLon);
    renderHistory(histData.history);
  } catch (err) {
    showError("Error: " + err.message);
    showResult(false);
    showHistory(false);
  } finally {
    showLoader(false);
  }
}

// --- Fetch AQI by City Name ---
async function fetchAirByCity(city) {
  showLoader(true);
  showResult(false);
  showError("");
  showHistory(false);
  historyList.innerHTML = "";

  try {
    // Fetch coordinates for the provided city name using /geo/direct
    const geoRes = await fetch(`${apiBaseUrl}/geo/direct?q=${encodeURIComponent(city)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found.");
    const { lat, lon, name, country, local_names } = geoData[0];
    const label = local_names && local_names.en ? local_names.en : name;
    // Fetch AQI and history for those coordinates
    await fetchAirAndHistory(lat, lon, `${label}, ${country}`);
  } catch (err) {
    showError("Error: " + err.message);
    showResult(false);
    showHistory(false);
    showLoader(false);
  }
}

// --- Button Events ---

// Manual city search: triggers fetchAirByCity with the city in the input
fetchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) fetchAirByCity(city);
});

// Geolocation button: gets user's coordinates and fetches AQI/history for that location
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError("Geolocation not supported in this browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      fetchAirAndHistory(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      showError("Please enable geolocation to use this feature.");
    }
  );
});

// Optional: Auto-trigger geolocation fetch on page load
// window.onload = () => { geoBtn.click(); };
