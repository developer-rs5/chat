# Chat Admin Dashboard

A complete admin dashboard for chat applications with analytics, country blocking, and Redis caching.

## Features

### 📊 Advanced Analytics
- **Real-time analytics** with live data updates
- **User analytics** by country with breakdowns
- **Message analytics** by country with breakdowns
- **Dashboard overview** with key metrics
- **Interactive charts** and visualizations

### 🌍 Country Blocking
- **Block/unblock countries** with 2-letter country codes
- **Search functionality** for easy country management
- **All countries available** with quick actions
- **Real-time country blocking** enforcement

### 🔧 Admin Dashboard
- **Password authentication** (default: helloworld123)
- **Session management** with secure cookies
- **Rate limiting** to prevent abuse
- **Security headers** with Helmet.js
- **Compression** for faster loading

### 💾 Low RAM Usage Database
- **In-memory caching** for fast data access
- **Redis integration** (can be easily enabled)
- **Rate limiting** with memory cache
- **Session storage** with Redis support

### 🚀 Docker Support
- **Docker Compose** configuration included
- **Multi-container setup** with Redis and Node.js
- **Production-ready** deployment
- **Environment variables** configuration

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Access Admin Panel
- **URL**: http://localhost:3000/admin
- **Password**: helloworld123

## Docker Deployment

### Using Docker Compose
```bash
docker-compose up -d
```

### Manual Docker Build
```bash
docker build -t chat-admin .
docker run -p 3000:3000 chat-admin
```

## Configuration

### Environment Variables
Create a `.env` file:
```env
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-secret-key-change-in-production
ADMIN_PASSWORD=helloworld123
```

### Redis Configuration
To enable Redis, uncomment the Redis client code in `server.js` and ensure Redis is running:
```bash
redis-server --daemonize yes
```

## API Endpoints

### Authentication
- `POST /api/admin/login` - Login with password
- `GET /api/admin/check-auth` - Check authentication status
- `POST /api/admin/logout` - Logout

### Analytics
- `GET /api/admin/analytics/overview` - Get overview statistics
- `GET /api/admin/analytics/users` - Get user analytics by country
- `GET /api/admin/analytics/messages` - Get message analytics by country
- `GET /api/admin/analytics/realtime` - Get real-time stats

### Country Management
- `GET /api/admin/countries` - Get blocked countries
- `POST /api/admin/countries/block` - Block a country
- `DELETE /api/admin/countries/unblock/:country` - Unblock a country

### Chat Link Management
- `GET /api/admin/chat-link` - Get current chat link
- `POST /api/admin/chat-link` - Update chat link

### Analytics Update
- `POST /api/analytics/update` - Update analytics data (for frontend integration)

## Security Features

### Rate Limiting
- **100 requests per 15 minutes** per IP
- **Memory-based caching** for performance
- **Automatic cleanup** of old entries

### Country Blocking
- **GeoIP detection** for user location
- **Real-time blocking** enforcement
- **Easy management** through admin panel

### Session Security
- **Secure session cookies** with HttpOnly flag
- **Session timeout** after 24 hours
- **Password hashing** with bcrypt

## File Structure

```
chat/
├── server.js              # Main server file
├── package.json           # Dependencies
├── docker-compose.yml    # Docker configuration
├── Dockerfile            # Docker build file
├── .env.example          # Environment template
├── start.sh              # Start script
├── README.md             # This file
├── index.html            # Main chat page
├── login.html            # Admin login page
├── admin.html            # Admin dashboard
├── analytics.html        # Analytics page
├── countries.html        # Country management
└── settings.html         # Settings page
```

## Admin Panel Pages

### 1. Dashboard (/admin)
- **Overview statistics** (messages, users, countries)
- **Real-time data** updates every 5 seconds
- **Quick navigation** to other sections

### 2. Analytics (/admin/analytics)
- **Detailed analytics** with charts
- **User and message breakdowns** by country
- **Interactive visualizations**

### 3. Countries (/admin/countries)
- **Country blocking** interface
- **Search functionality** for countries
- **Quick unblock** actions

### 4. Settings (/admin/settings)
- **Chat link configuration**
- **Server status** information
- **Quick actions** (reset analytics, clear cache)

## Performance Optimizations

### Memory Usage
- **In-memory caching** for frequently accessed data
- **Efficient data structures** for analytics
- **Automatic cleanup** of expired data

### Caching Strategy
- **Redis integration** for production
- **Memory cache** for development
- **Rate limiting** to prevent abuse

### Response Optimization
- **Compression** with gzip
- **Security headers** with Helmet.js
- **Efficient JSON responses**

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Redis connection failed**
   ```bash
   redis-server --daemonize yes
   ```

3. **Permission denied**
   ```bash
   chmod +x start.sh
   ```

### Logs
Check server logs:
```bash
tail -f server.log
```

## Development

### Adding New Features
1. Add API endpoints in `server.js`
2. Create corresponding HTML pages
3. Update frontend JavaScript for real-time updates

### Customization
- **Change password** in `server.js` or environment variables
- **Modify analytics** data collection logic
- **Add new visualizations** in analytics pages

## License

MIT License - feel free to use and modify for your needs.