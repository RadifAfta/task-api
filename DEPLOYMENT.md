# Deployment Guide for Task API

## Render Deployment

### Environment Variables Required:
```
PORT=4000
DB_HOST=your_postgresql_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Build Settings:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Troubleshooting:
If you encounter "Cannot find package" errors:
1. Ensure all dependencies are listed in package.json
2. Check that the Node.js version matches (18+)
3. Verify environment variables are set correctly
4. Make sure the build process completes successfully

### Common Issues:
- **Module not found**: Run `npm install` manually in the deployment environment
- **Database connection**: Ensure PostgreSQL database is properly configured
- **Environment variables**: All required env vars must be set in Render dashboard