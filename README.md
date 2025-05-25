# 🌿 AirCare

Application de suivi de la qualité de l’air en temps réel pour asthmatiques — UI moderne, Tailwind CSS, autocomplete, géolocalisation et recommandations santé.

---

## 🚀 Démarrage rapide (local)

1. Clone le repo :
   ```sh
   git clone https://github.com/carmelo0511/AirCare.git
   cd AirCare
Ouvre index.html dans ton navigateur
Autorise la géolocalisation si besoin
Tape une ville et profite de l’autocomplete
🛠️ Fonctionnalités

Géolocalisation automatique (reverse geocoding pour affichage ville)
Recherche de ville avec suggestions dynamiques (autocomplete)
Requêtes API OpenWeatherMap (Air Pollution)
Loader animé, transitions, alertes propres
Couleurs/emoji selon qualité de l’air (AQI)
Conseils santé pour asthmatiques
Responsive mobile/desktop
⚙️ Stack

HTML + TailwindCSS (CDN)
JS pur (no framework)
OpenWeatherMap API
🌩️ Roadmap Cloud

Ce frontend sera déployé sur AWS (S3, CloudFront, Lambda, DynamoDB, CloudWatch…).

🔒 Sécurité

La clé API est visible côté client uniquement en local.
En production cloud, elle sera sécurisée côté backend.

🤝 Auteur

Bryan Nakache
github.com/carmelo0511

