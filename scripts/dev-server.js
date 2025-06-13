const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'frontend', 'config.js');

// Always generate config.js so the API base URL reflects the environment
const apiUrl = process.env.API_BASE_URL || 'https://i5x97gj43e.execute-api.ca-central-1.amazonaws.com/prod';
const content = `export const API_BASE_URL = "${apiUrl}";\n`;
fs.writeFileSync(configPath, content);
console.log(`Generated ${configPath} with API_BASE_URL=${apiUrl}`);

execSync('npx --yes http-server frontend -c-1', { stdio: 'inherit', cwd: rootDir });
