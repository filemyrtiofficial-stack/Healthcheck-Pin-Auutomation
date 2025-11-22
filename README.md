# RTI Health Check Automation System

A complete automation system that monitors RTI (Right to Information) websites and automatically posts alerts to social media platforms when websites are down.

## Features

- ✅ Automated health checks for 10 RTI websites every hour
- ✅ Status logging to JSON files (no database required)
- ✅ Automatic social media posting (Twitter/X, Facebook, LinkedIn) when websites are down
- ✅ WhatsApp Web notifications via browser automation (100% free, no API)
- ✅ Browser automation (no APIs required - 100% free)
- ✅ Duplicate post prevention (24-hour cooldown)
- ✅ Comprehensive logging and error handling
- ✅ Template-based post generation
- ✅ Retry mechanism for failed checks

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Linux server** (for cron job execution)
- **Social media accounts** (Twitter/X, Facebook, LinkedIn)

## Installation

### 1. Clone or Download the Project

```bash
cd /path/to/your/project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root. You can manually create it or copy from the template below.

**Create `.env` file** with your social media credentials:

```env
# Twitter/X
TWITTER_EMAIL=your_twitter_email@example.com
TWITTER_PASSWORD=your_twitter_password
TWITTER_USERNAME=your_twitter_username

# Facebook
FACEBOOK_EMAIL=your_facebook_email@example.com
FACEBOOK_PASSWORD=your_facebook_password

# LinkedIn
LINKEDIN_EMAIL=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password

# WhatsApp (Baileys - Direct Connection, 100% Free)
# Use phone number with country code (no + sign)
WHATSAPP_ADMIN_NUMBER=8106342858
# Example: For India +91 8106342858, use: 918106342858
# Example: For US +1 5551234567, use: 15551234567

# Browser Settings (optional)
HEADLESS=true
BROWSER_TIMEOUT=30000
SOCIAL_MEDIA_TIMEOUT=60000

# Retry Settings (optional)
MAX_RETRIES=3
RETRY_DELAY=5000

# Logging (optional)
LOG_LEVEL=info
```

**Important Security Note:** Never commit the `.env` file to version control. It's already in `.gitignore`.

**Note:** If you don't have a `.env.example` file, create your `.env` file manually using the template above.

### 4. Test the Installation

Run a test to ensure everything is working:

```bash
npm start
```

This will:
- Check all 10 websites
- Log statuses to the database
- If any website is down, generate posts and attempt to post to social media

### 5. Set Up Cron Job

To run the automation every hour automatically:

```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

Or manually add to crontab:

```bash
crontab -e
```

Add this line (adjust paths as needed):

```
0 * * * * cd /path/to/project && /usr/bin/node src/index.js >> logs/cron.log 2>&1
```

## Project Structure

```
.
├── src/
│   ├── index.js                    # Main entry point
│   ├── checker/
│   │   └── websiteChecker.js       # Website status checking logic
│   ├── postGenerator/
│   │   ├── postGenerator.js        # Post message generation
│   │   └── templates.js            # Post templates
│   ├── browserAutomation/
│   │   └── socialMediaPoster.js    # Puppeteer automation for social media
│   └── utils/
│       ├── database.js             # JSON file-based storage
│       └── logger.js               # Logging utility
├── scripts/
│   └── setup-cron.sh               # Cron job setup script
├── logs/                           # Log files and database (auto-created)
├── config/                         # Configuration files
├── .env.example                    # Environment variables template
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

## How It Works

1. **Health Check**: Every hour, the script checks all 10 RTI websites
2. **Status Logging**: Results are saved to JSON files (`logs/website_status.json` and `logs/post_logs.json`)
3. **Down Detection**: If a website is detected as DOWN (not loading, showing errors, or non-functional):
   - Takes a screenshot for evidence
   - Generates alert messages using templates
   - Checks if we've posted about this website in the last 24 hours
   - If not, proceeds to notify
4. **WhatsApp Notification**: Uses Puppeteer to automate WhatsApp Web:
   - Opens WhatsApp Web in browser
   - Searches for configured contact/group
   - Sends alert message automatically
   - Session is saved for future use (no QR scan needed after first time)
5. **Social Media Posting**: Uses Puppeteer to automate browser and post to:
   - Twitter/X
   - Facebook
   - LinkedIn
6. **Post Logging**: All notifications (successful and failed) are logged to database

## Monitored Websites

1. Rajasthan RTI - https://rti.rajasthan.gov.in/
2. Sikkim RTI - https://rtionline.sikkim.gov.in/auth/login
3. Tripura RTI - https://rtionline.tripura.gov.in/
4. Uttar Pradesh RTI - https://rtionline.up.gov.in/
5. Uttarakhand RTI - https://rtionline.uk.gov.in/
6. West Bengal RTI - https://par.wb.gov.in/rtilogin.php
7. Chandigarh RTI - https://chandigarh.gov.in/submit-rti-application
8. Delhi RTI - https://rtionline.delhi.gov.in/
9. Jammu & Kashmir RTI - https://rtionline.jk.gov.in/
10. Ladakh RTI - https://rtionline.ladakh.gov.in/index.php

## Logs and Database

- **Application Logs**: `logs/automation.log`
- **Cron Logs**: `logs/cron.log`
- **Status Logs**: `logs/website_status.json` (JSON format)
- **Post Logs**: `logs/post_logs.json` (JSON format)

### View Recent Status Checks

You can view the JSON log files:

**Linux/Mac:**
```bash
cat logs/website_status.json | jq '.[-10:]'  # Last 10 entries
```

**Windows (PowerShell):**
```powershell
Get-Content logs/website_status.json | ConvertFrom-Json | Select-Object -Last 10
```

### View Recent Posts

**Linux/Mac:**
```bash
cat logs/post_logs.json | jq '.[-10:]'  # Last 10 entries
```

**Windows (PowerShell):**
```powershell
Get-Content logs/post_logs.json | ConvertFrom-Json | Select-Object -Last 10
```

## WhatsApp Setup

### Initial Setup (One-Time QR Code Scan)

1. **Set Contact/Group Name** in `.env`:
   ```env
   WHATSAPP_CONTACT_NAME=YourContactOrGroupName
   ```

2. **Run the script** (first time will require QR scan):
   ```bash
   npm start
   ```

3. **Scan QR Code**:
   - When script runs, it will open WhatsApp Web
   - If not logged in, you'll see a QR code
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices
   - Tap "Link a Device"
   - Scan the QR code shown in the browser

4. **Session Saved**: After first scan, the session is saved in `whatsapp-session/` directory
   - You won't need to scan QR code again
   - Session persists across script runs

### How WhatsApp Notifications Work

- **Automatic**: When any RTI website is DOWN, a WhatsApp message is sent automatically
- **Message Format**: Includes website name, URL, error details, and timestamp
- **Session Management**: Browser session is kept alive between runs
- **Error Handling**: If session expires, script will wait for new QR scan

### Troubleshooting WhatsApp

**Problem: QR code appears every time**
- Solution: Make sure `whatsapp-session/browser-data` directory has write permissions
- Check that browser isn't being closed between runs

**Problem: Contact/Group not found**
- Solution: Make sure `WHATSAPP_CONTACT_NAME` in `.env` matches exactly (case-sensitive)
- Use the exact name as it appears in your WhatsApp contact list

**Problem: Message not sending**
- Solution: Check if WhatsApp Web is fully loaded (wait a few seconds)
- Verify contact/group name is correct
- Check browser console for errors (set `HEADLESS=false` in `.env`)

**Problem: Session expired**
- Solution: Delete `whatsapp-session/browser-data` folder and run again
- Script will wait for new QR code scan

## Troubleshooting

### Browser Automation Issues

If social media posting fails:

1. **Check credentials**: Ensure `.env` has correct credentials
2. **Headless mode**: Try setting `HEADLESS=false` in `.env` to see what's happening
3. **Timeouts**: Increase `SOCIAL_MEDIA_TIMEOUT` if your connection is slow
4. **Platform changes**: Social media sites change their UI frequently. You may need to update selectors in `src/browserAutomation/socialMediaPoster.js`

### Cron Job Not Running

1. Check cron service is running: `systemctl status cron` (or `crond` on some systems)
2. Check cron logs: `tail -f logs/cron.log`
3. Verify cron job exists: `crontab -l`
4. Check system logs: `grep CRON /var/log/syslog`

### SSL Certificate Errors

If you encounter SSL errors, the script will log them as "SSL Certificate error" and treat the website as down.

### Rate Limiting

Social media platforms may rate limit or temporarily block automated posting. The script includes:
- 24-hour cooldown per website
- Error logging for failed posts
- Retry mechanism for website checks

## Security Best Practices

1. **Protect `.env` file**: Never commit it to version control
2. **File permissions**: Set restrictive permissions on `.env`:
   ```bash
   chmod 600 .env
   ```
3. **Regular updates**: Keep dependencies updated:
   ```bash
   npm audit
   npm update
   ```

## Customization

### Add More Websites

Edit `src/index.js` and add to the `WEBSITES` array:

```javascript
{ url: 'https://example.com', name: 'Example RTI' }
```

### Modify Post Templates

Edit `src/postGenerator/templates.js` to customize post messages.

### Change Cooldown Period

Edit `POST_COOLDOWN_HOURS` in `src/index.js`.

## Support

For issues or questions:
1. Check the logs in `logs/` directory
2. Review error messages in console output
3. Verify all environment variables are set correctly

## License

MIT License - Free to use and modify.

## Disclaimer

This automation tool uses browser automation to interact with social media platforms. Make sure you comply with:
- Terms of Service of each platform
- Rate limiting policies
- Local laws and regulations

Use responsibly and at your own risk.

