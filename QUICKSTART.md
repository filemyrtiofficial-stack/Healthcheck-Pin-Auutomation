# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create .env File

Create a `.env` file in the project root with your social media credentials:

```bash
# Copy this template and fill in your credentials
TWITTER_EMAIL=your_email@example.com
TWITTER_PASSWORD=your_password
TWITTER_USERNAME=your_username

FACEBOOK_EMAIL=your_email@example.com
FACEBOOK_PASSWORD=your_password

LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password

HEADLESS=true
BROWSER_TIMEOUT=30000
SOCIAL_MEDIA_TIMEOUT=60000
MAX_RETRIES=3
RETRY_DELAY=5000
LOG_LEVEL=info
```

## Step 3: Test the System

Run a test check (checks only 2 websites, no social media posting):

```bash
npm test
```

Or run the full check:

```bash
npm start
```

## Step 4: Set Up Automated Execution

### On Linux:

```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

### On Windows:

```powershell
npm run setup-cron-windows
```

Or manually create a Task Scheduler task that runs:
```
node src/index.js
```
Every hour.

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` again
- Make sure you're in the project directory

### Browser automation fails
- Set `HEADLESS=false` in `.env` to see what's happening
- Check that your social media credentials are correct
- Social media sites change their UI frequently - you may need to update selectors

### Log file errors
- Make sure the `logs/` directory exists and is writable
- Check file permissions (Linux/Mac: `chmod 755 logs`)

## Next Steps

- Check `logs/automation.log` for detailed logs
- View recent statuses: `cat logs/website_status.json | jq '.[-10:]'` (Linux/Mac) or open the JSON file (Windows)
- Review `README.md` for complete documentation



