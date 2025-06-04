const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_BASE_URL;
if (!apiUrl) {
  console.error('Error: API_BASE_URL environment variable is not set.');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'frontend', 'config.js');
const content = `export const API_BASE_URL = "${apiUrl}";\n`;
fs.writeFileSync(configPath, content);
console.log(`Updated ${configPath} with API_BASE_URL=${apiUrl}`);

