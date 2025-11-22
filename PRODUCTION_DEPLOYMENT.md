# Production Deployment Guide

This guide covers deploying the RTI Health Check Automation system to production.

## Prerequisites

1. **Node.js** v14 or higher
2. **npm** or **yarn**
3. **PM2** (recommended for process management) - `npm install -g pm2`
4. **Reverse Proxy** (Nginx/Apache) - recommended for production

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Frontend built for production
- [ ] Security middleware enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Logging configured
- [ ] Process manager (PM2) installed

## Step 1: Environment Setup

### Create `.env` file

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# WhatsApp Configuration
WHATSAPP_ADMIN_NUMBER=your_phone_number_with_country_code

# Social Media (Optional)
TWITTER_EMAIL=
TWITTER_PASSWORD=
TWITTER_USERNAME=
FACEBOOK_EMAIL=
FACEBOOK_PASSWORD=
LINKEDIN_EMAIL=
LINKEDIN_PASSWORD=

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Browser Settings
HEADLESS=true
BROWSER_TIMEOUT=30000
SOCIAL_MEDIA_TIMEOUT=60000

# Retry Settings
MAX_RETRIES=3
RETRY_DELAY=5000

# Logging
LOG_LEVEL=info
```

**Important Security Notes:**
- Set `CORS_ORIGIN` to your actual domain (not `*`)
- Use strong passwords for social media accounts
- Never commit `.env` file to version control
- Set file permissions: `chmod 600 .env`

## Step 2: Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

## Step 3: Build Frontend

```bash
# Linux/Mac
npm run build

# Windows
npm run build:win
```

Or manually:
```bash
cd frontend
npm run build
cd ..
```

## Step 4: Install Security Dependencies

The production build includes security middleware. Ensure these are installed:

```bash
npm install helmet express-rate-limit
```

## Step 5: Start with PM2 (Recommended)

PM2 provides process management, auto-restart, and logging:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start backend/server.js --name rti-healthcheck

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs rti-healthcheck

# Restart
pm2 restart rti-healthcheck

# Stop
pm2 stop rti-healthcheck

# Monitor
pm2 monit
```

## Step 6: Configure Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/rti-healthcheck`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase timeout for long-running requests
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rti-healthcheck /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Setup SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 8: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Step 9: Setup Cron Job (Optional)

If you want to run automated checks:

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * cd /path/to/project && /usr/bin/node src/index.js >> logs/cron.log 2>&1
```

## Monitoring and Maintenance

### Health Check

The application provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

### Logs

- Application logs: `logs/automation.log`
- PM2 logs: `pm2 logs rti-healthcheck`
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

### Updates

1. Pull latest code
2. Install dependencies: `npm install`
3. Build frontend: `npm run build`
4. Restart PM2: `pm2 restart rti-healthcheck`

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to version control
2. **File Permissions**: Set restrictive permissions on sensitive files
3. **CORS**: Configure specific origins, not `*`
4. **Rate Limiting**: Enabled by default (100 requests per 15 minutes)
5. **Security Headers**: Helmet.js provides security headers
6. **HTTPS**: Always use HTTPS in production
7. **Firewall**: Only open necessary ports
8. **Updates**: Keep dependencies updated: `npm audit` and `npm update`

## Troubleshooting

### Application won't start

1. Check environment variables: `cat .env`
2. Check logs: `pm2 logs rti-healthcheck`
3. Verify Node.js version: `node --version`
4. Check port availability: `netstat -tulpn | grep 3000`

### Frontend not loading

1. Verify frontend build: `ls -la frontend/dist/`
2. Check Nginx configuration: `sudo nginx -t`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### WhatsApp connection issues

1. Check WhatsApp session: `ls -la whatsapp-session/`
2. Verify phone number format in `.env`
3. Check logs for QR code requirements

## Performance Optimization

1. **Enable gzip compression** in Nginx
2. **Use CDN** for static assets
3. **Enable caching** for static files
4. **Monitor memory usage**: `pm2 monit`
5. **Scale horizontally** with PM2 cluster mode if needed

## Backup

Regularly backup:
- `config/websites.json`
- `whatsapp-session/` directory
- `.env` file (securely)
- Database files in `logs/`

## Support

For issues:
1. Check logs first
2. Review error messages
3. Verify environment configuration
4. Check GitHub issues

