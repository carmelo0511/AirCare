const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'frontend', 'config.js');

if (!fs.existsSync(configPath)) {
  const apiUrl = process.env.API_BASE_URL || 'https://your-api-endpoint';
  const content = `export const API_BASE_URL = "${apiUrl}";\n`;
  fs.writeFileSync(configPath, content);
  console.log(`Created ${configPath} with API_BASE_URL=${apiUrl}`);
}

execSync('npx http-server frontend -c-1', { stdio: 'inherit', cwd: rootDir });
