const apiKey = 'e8cba22ebb4d317ef3292bc271794e99';

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
let debounceTimeout = null;

const AQI_MAP = [
  { label: "Très bonne", color: "text-green-600", emoji: "🟢", advice: "Air pur, profitez !" },
  { label: "Bonne", color: "text-green-500", emoji: "😊", advice: "Rien à signaler pour les asthmatiques." },
  { label: "Modérée", color: "text-yellow-600", emoji: "😐", advice: "Évitez l'effort prolongé si sensible." },
  { label: "Mauvaise", color: "text-orange-600", emoji: "😷", advice: "Limitez vos sorties, surveillez vos symptômes." },
  { label: "Très mauvaise", color: "text-red-600", emoji: "🚨", advice: "Restez à l'intérieur et suivez votre traitement !" }
];

function showLoader(show) {
  loader.classList.toggle('hidden', !show);
}
function showResult(show) {
  result.classList.toggle('hidden', !show);
}
function showError(msg = "") {
  errorMsg.textContent = msg;
  errorMsg.classList.toggle('hidden', !msg);
}

// --- Autocomplete villes (OpenWeather Geo API) ---
cityInput.addEventListener('input', () => {
  const query = cityInput.value.trim();
  citySuggestions.innerHTML = '';
  citySuggestions.classList.add('hidden');
  if (!query || query.length < 2) return;

  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`);
      const data = await res.json();
      if (!data.length) return;

      citySuggestions.innerHTML = data.map(city =>
        `<li>${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}</li>`
      ).join('');
      citySuggestions.classList.remove('hidden');

      // Click event on suggestions
      Array.from(citySuggestions.children).forEach((li, idx) => {
        li.addEventListener('click', () => {
          cityInput.value = li.textContent;
          citySuggestions.classList.add('hidden');
        });
      });
    } catch (err) {
      // silence autocomplete error
    }
  }, 200);
});

// Masquer suggestions quand on clique ailleurs
document.addEventListener('click', (e) => {
  if (!citySuggestions.contains(e.target) && e.target !== cityInput) {
    citySuggestions.classList.add('hidden');
  }
});

async function fetchAirByCoords(lat, lon, locationLabel = null) {
  showLoader(true);
  showResult(false);
  showError("");
  try {
    // Reverse geocode : lat/lon -> nom de ville
    let cityLabel = locationLabel;
    if (!cityLabel) {
      const reverseRes = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`);
      const reverseData = await reverseRes.json();
      if (reverseData && reverseData[0]) {
        cityLabel = `${reverseData[0].name}, ${reverseData[0].country}`;
      } else {
        cityLabel = `Coordonnées : ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      }
    }

    const airRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const airData = await airRes.json();
    if (!airData.list || !airData.list[0]) throw new Error(airData.message || "Donnée indisponible");
    const aqi = airData.list[0].main.aqi;
    const info = AQI_MAP[aqi - 1];

    locationDisplay.textContent = cityLabel;
    qualityDisplay.textContent = `Qualité de l'air : ${info.label}`;
    qualityDisplay.className = `text-lg font-semibold ${info.color}`;
    recommendation.innerHTML = `<b>Conseil :</b> ${info.advice}`;
    emojiDisplay.textContent = info.emoji;

    showResult(true);
  } catch (err) {
    showError("Erreur : " + err.message);
    showResult(false);
  } finally {
    showLoader(false);
  }
}

async function fetchAirByCity(city) {
  showLoader(true);
  showResult(false);
  showError("");
  try {
    // OpenWeather attend juste le nom court
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("Ville introuvable.");
    const { lat, lon, name, country } = geoData[0];
    await fetchAirByCoords(lat, lon, `${name}, ${country}`);
  } catch (err) {
    showError("Erreur : " + err.message);
    showResult(false);
    showLoader(false);
  }
}

fetchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) fetchAirByCity(city);
});
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError("Géolocalisation non supportée sur ce navigateur.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      fetchAirByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      showError("Autorise la géolocalisation pour utiliser cette fonction.");
    }
  );
});

window.onload = () => {
  // Optionnel : auto-géoloc au chargement
  // geoBtn.click();
};
