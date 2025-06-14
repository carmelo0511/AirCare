const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_BASE_URL;

const configPath = path.join(__dirname, '..', 'frontend', 'config.js');
if (!apiUrl) {
  // Fallback to the sample configuration when the environment variable is
  // missing so the frontend still loads with placeholder values.
  const samplePath = path.join(__dirname, '..', 'frontend', 'config.sample.js');
  fs.copyFileSync(samplePath, configPath);
  console.warn(
    'API_BASE_URL not set. Copied config.sample.js to config.js instead.'
  );
  process.exit(0);
}
const content = `export const API_BASE_URL = "${apiUrl}";\n`;
fs.writeFileSync(configPath, content);
console.log(`Updated ${configPath} with API_BASE_URL=${apiUrl}`);

