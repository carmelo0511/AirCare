export const LANGUAGES = {
  en: {
    chooseCity: 'Choose a city:',
    search: 'Search',
    myLocation: '📍 My location',
    login: 'Login',
    logout: 'Logout',
    aqiHistory: 'AQI History',
    offline: "You're currently offline. Some features may be unavailable."
  },
  fr: {
    chooseCity: 'Choisissez une ville :',
    search: 'Rechercher',
    myLocation: '📍 Ma position',
    login: 'Connexion',
    logout: 'Déconnexion',
    aqiHistory: 'Historique AQI',
    offline: "Vous êtes hors ligne. Certaines fonctionnalités sont indisponibles."
  }
};

let currentLang = 'en';

export function setLanguage(lang) {
  if (!LANGUAGES[lang]) return;
  currentLang = lang;
  const t = LANGUAGES[lang];
  document.getElementById('chooseCityLabel').textContent = t.chooseCity;
  document.getElementById('fetchBtn').textContent = t.search;
  document.getElementById('geoBtn').textContent = t.myLocation;
  document.getElementById('loginBtn').textContent = t.login;
  document.getElementById('logoutBtn').textContent = t.logout;
  document.getElementById('aqiHistoryTitle').textContent = t.aqiHistory;
  const offlineEl = document.getElementById('offlineNotice');
  if (offlineEl) offlineEl.textContent = t.offline;
}

export function getCurrentLanguage() {
  return currentLang;
}
