const dataManager = require('./dataManager');

// In-memory cache
const cache = {
  analytics: null,
  countries: null,
  settings: null,
  lastCacheUpdate: 0,
  cacheTimeout: 30000 // 30 seconds cache timeout
};

// Load data with caching
async function getAnalytics() {
  const now = Date.now();
  
  if (!cache.analytics || (now - cache.lastCacheUpdate) > cache.cacheTimeout) {
    cache.analytics = await dataManager.loadAnalytics();
    cache.lastCacheUpdate = now;
  }
  
  return cache.analytics;
}

async function getCountries() {
  const now = Date.now();
  
  if (!cache.countries || (now - cache.lastCacheUpdate) > cache.cacheTimeout) {
    cache.countries = await dataManager.loadCountries();
    cache.lastCacheUpdate = now;
  }
  
  return cache.countries;
}

async function getSettings() {
  const now = Date.now();
  
  if (!cache.settings || (now - cache.lastCacheUpdate) > cache.cacheTimeout) {
    cache.settings = await dataManager.loadSettings();
    cache.lastCacheUpdate = now;
  }
  
  return cache.settings;
}

// Save data and update cache
async function updateAnalytics(data) {
  await dataManager.saveAnalytics(data);
  cache.analytics = data;
  cache.lastCacheUpdate = Date.now();
}

async function updateCountries(data) {
  await dataManager.saveCountries(data);
  cache.countries = data;
  cache.lastCacheUpdate = Date.now();
}

async function updateSettings(data) {
  await dataManager.saveSettings(data);
  cache.settings = data;
  cache.lastCacheUpdate = Date.now();
}

// Clear cache
function clearCache() {
  cache.analytics = null;
  cache.countries = null;
  cache.settings = null;
  cache.lastCacheUpdate = 0;
}

module.exports = {
  getAnalytics,
  getCountries,
  getSettings,
  updateAnalytics,
  updateCountries,
  updateSettings,
  clearCache
};
