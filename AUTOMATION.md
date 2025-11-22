# Full Automation Guide

## One Command to Run Everything

Simply run:
```bash
npm start
```

This single command will:
1. ✅ Check all RTI websites
2. ✅ Display results in terminal
3. ✅ Take screenshots of down websites
4. ✅ Send WhatsApp notifications to admin
5. ✅ Post to social media (if configured)
6. ✅ Log everything automatically

## WhatsApp Setup (One-Time)

### Step 1: Add Admin Number to .env

```env
WHATSAPP_ADMIN_NUMBER=8106342858
```

**Note**: Use phone number with country code (no + sign), or use contact/group name with `WHATSAPP_CONTACT_NAME`

### Step 2: First Run - Scan QR Code

1. Run the automation:
   ```bash
   npm start
   ```

2. Browser will open showing WhatsApp Web

3. **Scan QR Code**:
   - Open WhatsApp on your phone
   - Go to **Settings** → **Linked Devices**
   - Tap **"Link a Device"**
   - Scan the QR code shown in browser

4. **Wait for confirmation**: Terminal will show "✓ WhatsApp login successful!"

5. **Session Saved**: After first scan, you won't need to scan again

### Step 3: Automatic Operation

After first QR scan:
- Session is saved automatically
- Every time a website is DOWN:
  - WhatsApp message is sent automatically to admin number
  - No manual intervention needed
  - Fully automated

## Complete Workflow

```
npm start
  ↓
Check all websites
  ↓
If website DOWN:
  ├─ Take screenshot
  ├─ Send WhatsApp to admin (8106342858)
  ├─ Post to social media (if configured)
  └─ Log everything
  ↓
Display results in terminal
```

## Environment Variables

Minimum required for full automation:

```env
# WhatsApp Admin Number (required for notifications)
WHATSAPP_ADMIN_NUMBER=8106342858

# Optional: Social Media (if you want social media posting)
TWITTER_EMAIL=your_email@example.com
TWITTER_PASSWORD=your_password
TWITTER_USERNAME=your_username

FACEBOOK_EMAIL=your_email@example.com
FACEBOOK_PASSWORD=your_password

LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password

# Browser Settings
HEADLESS=false  # Set to true after first QR scan
```

## Automated Scheduling

### Linux (Cron):
```bash
./scripts/setup-cron.sh
```

### Windows (Task Scheduler):
```powershell
npm run setup-cron-windows
```

This will run `npm start` every hour automatically.

## Troubleshooting

### QR Code Appears Every Time
- Check `whatsapp-session/browser-data/` directory exists
- Verify write permissions
- Delete `whatsapp-session/` folder and rescan

### WhatsApp Not Sending
- Verify `WHATSAPP_ADMIN_NUMBER` is correct in `.env`
- Make sure number is saved in your WhatsApp contacts
- Check `logs/automation.log` for errors

### Session Expired
- Delete `whatsapp-session/browser-data/` folder
- Run `npm start` again
- Scan QR code when prompted

## Message Format

WhatsApp messages sent to admin include:
- ⚠️ Alert indicator
- Website name
- URL
- Error details
- Timestamp

Example:
```
⚠️ ALERT: RTI Website DOWN

🌐 Website: Rajasthan RTI
🔗 URL: https://rti.rajasthan.gov.in/
❌ Error: Page Not Loading
⏰ Time: 21-Nov-2025, 05:27 AM

This affects citizens trying to file RTI applications. Please check and fix urgently!
```

## Full Automation Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with `WHATSAPP_ADMIN_NUMBER=8106342858`
- [ ] First run completed (QR code scanned)
- [ ] Session saved (check `whatsapp-session/` folder exists)
- [ ] Test run successful (website checked, WhatsApp sent)
- [ ] Cron/Task Scheduler set up (optional, for hourly runs)

## That's It!

Once set up, just run `npm start` and everything works automatically! 🚀

