# Quick Setup for WhatsApp Notifications

## Step 1: Add Admin Number to .env

Create or edit `.env` file in project root:

```env
WHATSAPP_ADMIN_NUMBER=8106342858
```

**Important**: 
- Use phone number with country code (no + sign)
- Number must be saved in your WhatsApp contacts
- Or use contact name: `WHATSAPP_CONTACT_NAME=AdminName`

## Step 2: Run Automation

```bash
npm start
```

## Step 3: First Time - Scan QR Code

When you run for the first time:

1. Browser will open showing WhatsApp Web
2. **Terminal will show**:
   ```
   ============================================================
   WHATSAPP QR CODE SCAN REQUIRED
   ============================================================
   1. Open WhatsApp on your phone
   2. Go to Settings → Linked Devices
   3. Tap "Link a Device"
   4. Scan the QR code shown in the browser window
   ============================================================
   ```

3. **Scan QR code** with your phone
4. **Wait for confirmation**: `✓ WhatsApp login successful! Session saved.`

## Step 4: Automatic Operation

After first QR scan:
- ✅ Session is saved automatically
- ✅ Every time a website is DOWN, WhatsApp message is sent automatically
- ✅ No manual intervention needed
- ✅ Fully automated

## Test It

To test WhatsApp notifications:

1. Make sure `.env` has `WHATSAPP_ADMIN_NUMBER=8106342858`
2. Run: `npm start`
3. If any website is DOWN, you'll see:
   ```
   📱 Sending WhatsApp notification to 8106342858...
      Opening WhatsApp Web...
      Loading WhatsApp Web...
      Waiting for WhatsApp to be ready...
      Searching for contact: 8106342858...
      Sending message...
      ✓ Message sent!
   ✓ WhatsApp notification sent successfully!
   ```

## Troubleshooting

### WhatsApp Not Sending

1. **Check .env file**:
   ```bash
   # Make sure this line exists:
   WHATSAPP_ADMIN_NUMBER=8106342858
   ```

2. **Check if number is in contacts**:
   - Number must be saved in your WhatsApp contacts
   - Or use contact name instead

3. **Check session**:
   - If QR code appears every time, delete `whatsapp-session/` folder
   - Run again and scan QR code

4. **Check logs**:
   ```bash
   # View detailed logs
   cat logs/automation.log
   ```

### QR Code Issues

- **Browser not opening**: Set `HEADLESS=false` in `.env`
- **QR code not showing**: Make sure browser window is visible
- **Session expired**: Delete `whatsapp-session/browser-data/` and rescan

## That's It!

Once set up, just run `npm start` and WhatsApp notifications work automatically! 🚀

