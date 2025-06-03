# 🌬️ AirCare

**AirCare** is a cloud-native web application that provides real-time air quality data (AQI) for people with asthma or respiratory sensitivity.  
It leverages a 100% serverless AWS architecture and integrates with the OpenWeatherMap API.

This project is fully automated: every push to GitHub updates both the frontend (S3/CloudFront) and the backend (AWS Lambda) via CI/CD with GitHub Actions. No manual deployments required.

---

## Deployment on CloudFront

The static frontend of AirCare is hosted and distributed via Amazon CloudFront. You can access the live version of the project at:

[https://d1wvrgloixxub.cloudfront.net](https://d1wvrgloixxub.cloudfront.net)

This CloudFront distribution points to the S3 bucket configured to serve all HTML, CSS, JS, and static assets. On every push to the `main` branch, the GitHub Actions workflow automatically:

1. Syncs the local contents of the `frontend/` folder to the S3 bucket.
2. Invalidates the CloudFront cache to ensure the latest changes are served immediately.

---

## DynamoDB AQI History (NEW)

AirCare **persists all AQI lookups** to a DynamoDB table (`AirCareHistoryAQI`).  
Each time a user requests air quality for a city or location, the following data is stored :
- Location (`lat,lon`)
- Timestamp (ISO format)
- AQI value
- Particulate data (PM2.5, PM10, etc.)
- Health advice

A dedicated endpoint (`/history`) allows the frontend to **display the full AQI history** for any location.  
This enables analytics, trends, and potential dashboards (QuickSight integration is the next step).

---

## CloudWatch & SNS Screenshots

Below is a screenshot showing the CloudWatch alarm configuration linked to an SNS topic:

![CloudWatch & SNS Configuration](assets1/cloudwatch-alarm.png)

---

## 🧱 Cloud Architecture (diagram)

![AirCare Architecture](assets1/diagramme.png)

**Current stack:**

- ⚡ **Frontend**: HTML, Tailwind CSS, JavaScript
- ☁️ **Backend**: AWS Lambda (Node.js)
- 🌐 **API Gateway**: Handles endpoints `/air`, `/geo/direct`, `/geo/reverse`, `/history`
- 🗃️ **DynamoDB**: Stores AQI history for analytics & dashboards
- 🔒 **API key secured** (OpenWeatherMap) via Lambda proxy
- 🔍 **CloudWatch logs** for backend observability
- ⚠️ **CloudWatch Alarm** + **SNS Email alert** on Lambda error
- 📦 **S3**: Static assets hosting
---

## 🖥️ Backend Lambda

All AWS Lambda source code is included in the [`backend/`](./backend/) folder.

- **Language:** Node.js 18.x (uses AWS SDK v3, native `fetch()`)
- **Endpoints handled:**
  - `/geo/direct` – City autocomplete (OpenWeatherMap API)
  - `/geo/reverse` – Reverse geocoding (coordinates → city)
  - `/air` – Air Quality Index (AQI) for a location or city (stores each lookup in DynamoDB)
  - `/history` – Fetch AQI lookup history from DynamoDB for a specific location
- **Features:**
  - Persists each AQI lookup to DynamoDB (`AirCareHistoryAQI`)
  - Adds tailored health advice for each AQI level
  - Handles errors and logs all requests to CloudWatch
  - Enforces English responses from OpenWeather
  - `/history` decodes the `location` parameter for reliable lookups
  - API keys and table names are **never hardcoded** (managed with environment variables)
- **How to deploy:**  
  1. Edit the code in [`backend/index.js`](./backend/index.js)  
  2. Zip the contents of `backend/` and upload to AWS Lambda (or automate via CI/CD)  
  3. See comments in `index.js` for full code explanations

---


## 🚀 Features

- 📍 Automatic geolocation for current city detection
- 🔍 City search with autocompletion
- 💨 Displays air quality index + health advice based on AQI
- 📈 Displays local AQI history (via DynamoDB)
- 📄 Shows a message when no history is available
- 🔐 Secure server-side OpenWeather API access
- 🌐 Clean UI/UX with Tailwind CSS

---

## 📦 Deployment

This project is fully deployed on **AWS**:

- 🗂️ Static frontend hosted on **S3**
- 🚀 Served via **CloudFront**
- ⚙️ Backend built with **Lambda + API Gateway**
- 🗃️ **AQI history stored in DynamoDB**
- ✅ CI/CD automated with **GitHub Actions**

---

## 📊 Monitoring & Alerts

- 🧠 Structured **CloudWatch logs** on every request
- ⚠️ **CloudWatch Alarm** triggered on ≥ 1 error/minute
- 📧 Email notifications via **SNS**
- 📉 AQI history stored and visualizable via **DynamoDB**

---

## 📂 Project Structure

AirCare/  
├── assets1/ # Images & diagrams  
│   └── diagramme.png  
├── backend/ # Lambda source code  
├── frontend/ # HTML/CSS/JavaScript  
├── .github/workflows/ # CI/CD with GitHub Actions  
├── README.md # This file

---

## Development

1. Install **Node.js 18** or newer.
2. Navigate to the `backend/` folder and run `npm install` to install dependencies.
3. Set your OpenWeatherMap API key in the `OPENWEATHER_APIKEY` environment variable, e.g.
   ```bash
   export OPENWEATHER_APIKEY=your_api_key
   ```
4. Execute the test suite with `npm test`.

---

## ✅ Security

- The API key is **never exposed** to the client
- AWS IAM roles follow the principle of least privilege
- No secrets hardcoded in the repo (managed via GitHub Secrets)

---

## 🚧 Upcoming Improvements

- 📊 Build a **QuickSight Dashboard** for AQI trends (from DynamoDB)
- 👥 Integrate **Amazon Cognito** for user authentication
- 📜 Implement API Gateway **usage plans and throttling**

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## 🙋 Contact

Bryan Nakache
[LinkedIn](https://www.linkedin.com/in/bryan-nakache-08147b1b7/) • GitHub: [@carmelo0511](https://github.com/carmelo0511)
