const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Analytics data management
async function loadAnalytics() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'analytics.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      totalMessages: 0,
      totalUsers: 100,
      userCountByCountry: {},
      messageCountByCountry: {},
      activeCountries: 0,
      uniqueIPs: 0,
      lastUpdated: null
    };
  }
}

async function saveAnalytics(data) {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, 'analytics.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

// Countries data management
async function loadCountries() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'countries.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    return { blockedCountries: [] };
  }
}

async function saveCountries(data) {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, 'countries.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

// Settings data management
async function loadSettings() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'settings.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      chatLink: 'https://zenuxs-host.ai/preview/grid-nova-website',
      lastUpdated: null
    };
  }
}

async function saveSettings(data) {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, 'settings.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

module.exports = {
  loadAnalytics,
  saveAnalytics,
  loadCountries,
  saveCountries,
  loadSettings,
  saveSettings
};
