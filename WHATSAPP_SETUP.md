# WhatsApp Notification Setup Guide

## Overview

The system uses WhatsApp Web through browser automation (Puppeteer) to send alerts when RTI websites are down. This is **100% free** - no APIs, no paid services.

## Initial Setup (One-Time)

### Step 1: Configure Contact/Group Name

Add to your `.env` file:

```env
WHATSAPP_CONTACT_NAME=YourContactOrGroupName
WHATSAPP_TIMEOUT=60000
```

**Important**: 
- Use the **exact name** as it appears in your WhatsApp contact list
- Case-sensitive
- Can be a contact name or group name
- For groups, use the exact group name

### Step 2: First Run (QR Code Scan)

1. **Run the automation**:
   ```bash
   npm start
   ```

2. **Browser will open** (if `HEADLESS=false` in `.env`) showing WhatsApp Web

3. **If you see QR code**:
   - Open WhatsApp on your phone
   - Go to **Settings** → **Linked Devices**
   - Tap **"Link a Device"**
   - Scan the QR code shown in the browser

4. **Wait for login**:
   - Script will wait up to 5 minutes for you to scan
   - Once scanned, WhatsApp Web will load
   - Session is automatically saved

5. **Session Saved**:
   - After first scan, session is saved in `whatsapp-session/browser-data/`
   - You won't need to scan QR code again
   - Session persists across script runs

### Step 3: Verify It Works

1. The script will automatically:
   - Open WhatsApp Web
   - Search for your contact/group
   - Send a test message (when a website is down)

2. Check your WhatsApp to confirm message was received

## How It Works

### Workflow

1. **Website Check**: Script checks all RTI websites
2. **If DOWN Detected**:
   - Takes screenshot
   - Generates WhatsApp alert message
   - Opens WhatsApp Web (or uses existing session)
   - Searches for configured contact/group
   - Sends alert message automatically
3. **Session Management**: Browser session is kept alive between runs

### Message Format

WhatsApp messages include:
- ⚠️ Alert emoji
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
⏰ Time: 20-Nov-2025, 12:15 PM

This affects citizens trying to file RTI applications. Please check and fix urgently!
```

## Troubleshooting

### Problem: QR Code Appears Every Time

**Solution**:
1. Check `whatsapp-session/browser-data/` directory exists
2. Verify write permissions on the directory
3. Make sure browser isn't being closed between runs
4. Delete `whatsapp-session/` folder and try again

### Problem: Contact/Group Not Found

**Solution**:
1. Check `WHATSAPP_CONTACT_NAME` in `.env` matches exactly
2. Case-sensitive - must match exactly as it appears in WhatsApp
3. For groups, use the exact group name (not your name in the group)
4. Try with a simple contact name first to test

### Problem: Message Not Sending

**Solution**:
1. Set `HEADLESS=false` in `.env` to see what's happening
2. Check if WhatsApp Web is fully loaded (wait a few seconds)
3. Verify contact/group name is correct
4. Check browser console for errors
5. Make sure WhatsApp Web is not blocked by your network

### Problem: Session Expired

**Solution**:
1. Delete `whatsapp-session/browser-data/` folder
2. Run script again
3. Scan QR code when prompted
4. Session will be saved again

### Problem: Browser Not Opening

**Solution**:
1. Check if Puppeteer is installed: `npm install`
2. Verify `HEADLESS` setting in `.env`
3. Check system requirements (Chrome/Chromium needed)
4. On Linux servers, may need: `apt-get install -y chromium-browser`

### Problem: Script Hangs Waiting for QR Scan

**Solution**:
1. Script waits up to 5 minutes for QR scan
2. If you need more time, increase `WHATSAPP_TIMEOUT` in `.env`
3. Or scan QR code manually in a separate browser, then run script

## Advanced Configuration

### Change Timeout

```env
WHATSAPP_TIMEOUT=120000  # 2 minutes (in milliseconds)
```

### Run in Headless Mode

```env
HEADLESS=true  # Browser runs in background (no visible window)
```

**Note**: For first-time QR scan, set `HEADLESS=false` to see the QR code.

### Multiple Contacts/Groups

Currently supports one contact/group. To send to multiple:
1. Create a WhatsApp group
2. Add all contacts to the group
3. Set `WHATSAPP_CONTACT_NAME` to the group name

## Security Notes

1. **Session Storage**: WhatsApp session is stored locally in `whatsapp-session/`
2. **Privacy**: Never commit `whatsapp-session/` to version control (already in `.gitignore`)
3. **Access**: Only the machine running the script can use the session
4. **Expiration**: WhatsApp sessions may expire after long inactivity

## Best Practices

1. **Test First**: Test with a personal contact before using production
2. **Monitor**: Check `logs/automation.log` for WhatsApp errors
3. **Backup**: If session works, backup `whatsapp-session/` folder
4. **Group Usage**: Use a dedicated group for alerts to avoid spam
5. **Rate Limiting**: WhatsApp may rate limit if sending too many messages

## Session Management

- **Session Location**: `whatsapp-session/browser-data/`
- **Persistence**: Session survives script restarts
- **Expiration**: May need to rescan QR code after long inactivity
- **Multiple Instances**: Don't run multiple instances simultaneously

## Support

If you encounter issues:
1. Check `logs/automation.log` for detailed error messages
2. Set `HEADLESS=false` to see browser actions
3. Verify `.env` configuration
4. Test with a simple contact name first


