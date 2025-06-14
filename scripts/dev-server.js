const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'frontend', 'config.js');
const cognitoConfigPath = path.join(rootDir, 'frontend', 'cognito-config.js');

// Always generate config.js so the API base URL reflects the environment
const apiUrl = process.env.API_BASE_URL || 'https://i5x97gj43e.execute-api.ca-central-1.amazonaws.com/prod';
const content = `export const API_BASE_URL = "${apiUrl}";\n`;
fs.writeFileSync(configPath, content);
console.log(`Generated ${configPath} with API_BASE_URL=${apiUrl}`);

// Generate Cognito configuration if environment variables are provided
const {
  COGNITO_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_DOMAIN
} = process.env;

if (COGNITO_REGION && COGNITO_USER_POOL_ID && COGNITO_USER_POOL_CLIENT_ID && COGNITO_DOMAIN) {
  const cognitoContent = `export const COGNITO_CONFIG = {\n  Auth: {\n    region: "${COGNITO_REGION}",\n    userPoolId: "${COGNITO_USER_POOL_ID}",\n    userPoolWebClientId: "${COGNITO_USER_POOL_CLIENT_ID}",\n    oauth: {\n      domain: "${COGNITO_DOMAIN}",\n      scope: ["openid", "email"],\n      redirectSignIn: window.location.origin,\n      redirectSignOut: window.location.origin,\n      responseType: "code"\n    }\n  }\n};\n`;
  fs.writeFileSync(cognitoConfigPath, cognitoContent);
  console.log(`Generated ${cognitoConfigPath}`);
} else {
  console.warn('Cognito environment variables not fully set; skipping cognito-config.js generation.');
}

execSync('npx --yes http-server frontend -c-1', { stdio: 'inherit', cwd: rootDir });
