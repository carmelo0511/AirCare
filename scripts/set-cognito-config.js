const fs = require('fs');
const path = require('path');

const { COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_USER_POOL_CLIENT_ID, COGNITO_DOMAIN } = process.env;

if (!COGNITO_REGION || !COGNITO_USER_POOL_ID || !COGNITO_USER_POOL_CLIENT_ID || !COGNITO_DOMAIN) {
  console.error('Error: Cognito environment variables not fully set.');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'frontend', 'cognito-config.js');
const content = `export const COGNITO_CONFIG = {
  Auth: {
    region: "${COGNITO_REGION}",
    userPoolId: "${COGNITO_USER_POOL_ID}",
    userPoolWebClientId: "${COGNITO_USER_POOL_CLIENT_ID}",
    oauth: {
      domain: "${COGNITO_DOMAIN}",
      scope: ["openid", "email"],
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin,
      responseType: "code"
    }
  }
};\n`;
fs.writeFileSync(configPath, content);
console.log(`Updated ${configPath}`);
