# Installation Instructions

## System Requirements

- **Node.js**: Version 14.0.0 or higher
- **npm**: Comes with Node.js
- **Operating System**: Linux (recommended for cron) or Windows (with Task Scheduler)
- **Memory**: At least 2GB RAM (for browser automation)
- **Disk Space**: ~500MB for Node.js dependencies

## Step-by-Step Installation

### 1. Verify Node.js Installation

```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

### 2. Navigate to Project Directory

```bash
cd "/path/to/HealthCheck Pin automation"
```

### 3. Install Node.js Dependencies

```bash
npm install
```

This will install:
- `puppeteer` - Browser automation
- `axios` - HTTP requests for website checking
- `dotenv` - Environment variable management
- JSON file-based storage (no database required)

**Installation may take 2-5 minutes** as Puppeteer downloads Chromium browser.

### 4. Create Environment Configuration

Create a file named `.env` in the project root:

**Linux/Mac:**
```bash
cat > .env << 'EOF'
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
EOF
```

**Windows (PowerShell):**
```powershell
@"
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
"@ | Out-File -FilePath .env -Encoding utf8
```

Then edit `.env` and replace placeholder values with your actual credentials.

### 5. Set File Permissions (Linux/Mac)

```bash
chmod 600 .env
chmod +x scripts/setup-cron.sh
```

### 6. Test Installation

Run a test to verify everything works:

```bash
npm test
```

This will:
- Check 2 websites (Rajasthan and Sikkim RTI)
- Save results to database
- Generate sample post messages (but won't post to social media)

### 7. Run Full Check (Optional)

To test the complete system including social media posting:

```bash
npm start
```

**Note:** This will actually post to social media if any website is down. Use with caution during testing.

### 8. Set Up Automated Scheduling

#### Linux (using cron):

```bash
./scripts/setup-cron.sh
```

This creates a cron job that runs every hour.

#### Windows (using Task Scheduler):

```powershell
npm run setup-cron-windows
```

Or manually:
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "Daily" → "Repeat task every: 1 hour"
4. Action: Start a program
5. Program: `node`
6. Arguments: `src/index.js`
7. Start in: `[project directory path]`

## Verification

After installation, verify:

1. **Dependencies installed:**
   ```bash
   ls node_modules | head -5
   ```

2. **Log files created:**
   ```bash
   ls logs/website_status.json logs/post_logs.json
   ```

3. **Logs directory exists:**
   ```bash
   ls logs/
   ```

4. **Cron job set (Linux):**
   ```bash
   crontab -l | grep index.js
   ```

5. **Task scheduled (Windows):**
   ```powershell
   Get-ScheduledTask -TaskName "RTI-HealthCheck-Automation"
   ```

## Common Installation Issues

### Issue: "npm install" fails

**Solution:**
- Update npm: `npm install -g npm@latest`
- Clear cache: `npm cache clean --force`
- Try again: `npm install`

### Issue: Puppeteer download fails

**Solution:**
- Set environment variable: `export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false`
- Or install Chromium manually: `npm install puppeteer --force`

### Issue: Permission denied on scripts

**Solution (Linux/Mac):**
```bash
chmod +x scripts/*.sh
```

### Issue: Log files creation fails

**Solution:**
- Ensure `logs/` directory exists: `mkdir -p logs` (Linux/Mac) or create manually (Windows)
- Check write permissions: `chmod 755 logs` (Linux/Mac)

### Issue: Node.js version too old

**Solution:**
- Install Node.js 14+ from https://nodejs.org/
- Or use nvm: `nvm install 14 && nvm use 14`

## Post-Installation

1. **Monitor logs:**
   ```bash
   tail -f logs/automation.log
   ```

2. **Check log files:**
   ```bash
   # Linux/Mac
   wc -l logs/website_status.json
   # Windows
   # Open logs/website_status.json and check the array length
   ```

3. **Test social media posting:**
   - Temporarily set a test website URL to a non-existent domain
   - Run `npm start`
   - Verify posts appear on your social media accounts

## Uninstallation

To remove the automation:

1. **Remove cron job (Linux):**
   ```bash
   crontab -e
   # Delete the line with index.js
   ```

2. **Remove scheduled task (Windows):**
   ```powershell
   Unregister-ScheduledTask -TaskName "RTI-HealthCheck-Automation" -Confirm:$false
   ```

3. **Remove project (optional):**
   ```bash
   rm -rf node_modules
   rm -rf logs
   rm .env
   ```

## Support

If you encounter issues:
1. Check `logs/automation.log` for error messages
2. Verify all environment variables are set correctly
3. Test with `HEADLESS=false` to see browser automation
4. Review the README.md for detailed documentation



