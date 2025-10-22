const fs = require('fs').promises;
const path = require('path');

const jsonDir = path.join(__dirname, '../json');

async function loadJson(filename) {
  try {
    const data = await fs.readFile(path.join(jsonDir, filename), 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e.message);
    return null;
  }
}

async function saveJson(filename, data) {
  try {
    await fs.writeFile(path.join(jsonDir, filename), JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${filename}:`, e.message);
  }
}

module.exports = { loadJson, saveJson };
