const express = require('express');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const cacheManager = require('./cacheManager');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for rate limiting
const ipCache = new Map();

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Apply rate limiting
app.use(limiter);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// Password check middleware
const checkPassword = async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(401).json({ error: 'Password required' });
  }

  const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD || 'helloworld123');

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  next();
};

// Get client IP and country
const getClientInfo = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  const country = geo?.country || 'Unknown';

  return { ip, country };
};

// Block country middleware
const blockCountryMiddleware = async (req, res, next) => {
  const { country } = getClientInfo(req);
  const countries = await cacheManager.getCountries();

  if (countries.blockedCountries.includes(country)) {
    return res.status(403).json({ error: 'Access denied from your country' });
  }

  next();
};

// API Routes

// Admin authentication
app.post('/api/admin/login', checkPassword, (req, res) => {
  req.session.adminLoggedIn = true;
  res.json({ success: true, message: 'Login successful' });
});

app.get('/api/admin/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.adminLoggedIn });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Analytics endpoints
app.get('/api/admin/analytics/overview', blockCountryMiddleware, async (req, res) => {
  const analytics = await cacheManager.getAnalytics();
  const settings = await cacheManager.getSettings();

  res.json({
    totalMessages: analytics.totalMessages,
    totalUsers: analytics.totalUsers,
    chatLink: settings.chatLink,
    activeCountries: analytics.activeCountries
  });
});

app.get('/api/admin/analytics/users', blockCountryMiddleware, async (req, res) => {
  const analytics = await cacheManager.getAnalytics();

  res.json({
    breakdown: Object.entries(analytics.userCountByCountry).map(([country, count]) => ({ country, count }))
  });
});

app.get('/api/admin/analytics/messages', blockCountryMiddleware, async (req, res) => {
  const analytics = await cacheManager.getAnalytics();

  res.json({
    breakdown: Object.entries(analytics.messageCountByCountry).map(([country, count]) => ({ country, count }))
  });
});

app.get('/api/admin/analytics/realtime', blockCountryMiddleware, async (req, res) => {
  const analytics = await cacheManager.getAnalytics();

  res.json({
    activeCountries: analytics.activeCountries,
    uniqueIPs: analytics.uniqueIPs
  });
});

// Chat link management
app.get('/api/admin/chat-link', blockCountryMiddleware, async (req, res) => {
  const settings = await cacheManager.getSettings();
  res.json({ chatLink: settings.chatLink });
});

app.post('/api/admin/chat-link', blockCountryMiddleware, async (req, res) => {
  const { chatLink } = req.body;

  if (!chatLink) {
    return res.status(400).json({ error: 'Chat link is required' });
  }

  const settings = await cacheManager.getSettings();
  settings.chatLink = chatLink;
  settings.lastUpdated = new Date().toISOString();

  await cacheManager.updateSettings(settings);
  res.json({ success: true, message: 'Chat link updated' });
});

// Country blocking
app.get('/api/admin/countries', blockCountryMiddleware, async (req, res) => {
  const countries = await cacheManager.getCountries();
  res.json({ blockedCountries: countries.blockedCountries });
});

app.post('/api/admin/countries/block', blockCountryMiddleware, async (req, res) => {
  const { country } = req.body;

  if (!country) {
    return res.status(400).json({ error: 'Country is required' });
  }

  const countries = await cacheManager.getCountries();

  if (countries.blockedCountries.includes(country)) {
    return res.json({ success: false, message: 'Country already blocked' });
  }

  countries.blockedCountries.push(country);
  await cacheManager.updateCountries(countries);
  res.json({ success: true, message: `Country ${country} blocked` });
});

app.delete('/api/admin/countries/unblock/:country', blockCountryMiddleware, async (req, res) => {
  const { country } = req.params;

  const countries = await cacheManager.getCountries();
  const index = countries.blockedCountries.indexOf(country);

  if (index === -1) {
    return res.json({ success: false, message: 'Country not blocked' });
  }

  countries.blockedCountries.splice(index, 1);
  await cacheManager.updateCountries(countries);
  res.json({ success: true, message: `Country ${country} unblocked` });
});

// Update analytics
app.post('/api/analytics/update', async (req, res) => {
  const { country, isNewUser } = req.body;

  const analytics = await cacheManager.getAnalytics();

  analytics.totalMessages += 1;

  if (isNewUser) {
    analytics.userCountByCountry[country] = (analytics.userCountByCountry[country] || 0) + 1;
    analytics.totalUsers += 1;
  }

  analytics.messageCountByCountry[country] = (analytics.messageCountByCountry[country] || 0) + 1;
  analytics.activeCountries += 1;
  analytics.lastUpdated = new Date().toISOString();

  await cacheManager.updateAnalytics(analytics);
  res.json({ success: true });
});

// Frontend routes
app.get('/admin', (req, res) => {
  if (req.session.adminLoggedIn) {
    res.sendFile(__dirname + '/admin.html');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

app.get('/admin/analytics', blockCountryMiddleware, (req, res) => {
  if (req.session.adminLoggedIn) {
    res.sendFile(__dirname + '/analytics.html');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

app.get('/admin/countries', blockCountryMiddleware, (req, res) => {
  if (req.session.adminLoggedIn) {
    res.sendFile(__dirname + '/countries.html');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

app.get('/admin/settings', blockCountryMiddleware, (req, res) => {
  if (req.session.adminLoggedIn) {
    res.sendFile(__dirname + '/settings.html');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start server
const startServer = async () => {
  try {
    // Initialize data
    await cacheManager.getAnalytics();
    await cacheManager.getCountries();
    await cacheManager.getSettings();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Admin panel at http://localhost:${PORT}/admin`);
      console.log(`Password: helloworld123`);
      console.log(`Data persistence: JSON files + in-memory caching`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
