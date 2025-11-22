const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.qrShown = false;
    this.adminPhoneNumber = process.env.WHATSAPP_ADMIN_NUMBER || process.env.ADMIN_PHONE_NUMBER || '';
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, '../../whatsapp-session');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  /**
   * Initialize WhatsApp connection
   */
  async initialize() {
    if (this.isConnecting) {
      console.log('🔄 Connection already in progress...');
      return;
    }

    if (this.isConnected && this.sock) {
      console.log('✅ WhatsApp already connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('🔄 Initializing WhatsApp connection...');

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Fetch latest Baileys version
      const { version } = await fetchLatestBaileysVersion();
      console.log(`📦 Using Baileys version: ${version.join('.')}`);

      // Create WhatsApp socket
      this.sock = makeWASocket({
        version,
        printQRInTerminal: false, // We'll handle QR manually with better formatting
        auth: state,
        logger: pino({ level: 'silent' }), // Suppress default logs
        browser: ['WhatsApp Notification Bot', 'Chrome', '1.0.0'],
        // Generate QR every 20 seconds if not connected
        generateHighQualityLinkPreview: true
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Display QR code - handle refresh if QR expires
        if (qr) {
          // Clear previous QR display if refreshing
          if (this.qrShown) {
            console.log('\n🔄 QR code refreshed. Please scan the new QR code:\n');
          } else {
            console.log('\n📱 Scan this QR code with WhatsApp:');
            console.log('=====================================\n');
          }

          // Generate QR code in terminal
          qrcode.generate(qr, { small: true });

          if (!this.qrShown) {
            console.log('\n=====================================\n');
            console.log('📋 Instructions:');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Go to Settings → Linked Devices');
            console.log('3. Tap "Link a Device"');
            console.log('4. Scan the QR code above');
            console.log('\n⏳ Waiting for QR scan...\n');
          }

          this.qrShown = true;
        }

        // Handle connection status
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
          const wasLoggedOut = (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut);

          if (wasLoggedOut) {
            console.log('\n❌ Connection closed. Logged out. A new QR code will be shown shortly...');
            this.isConnected = false;
            this.isConnecting = false;
            this.qrShown = false; // Reset to show new QR

            // Don't clear session immediately - let Baileys generate new QR first
            // Session will be cleared on next initialize if needed
          } else if (shouldReconnect) {
            // Only log reconnection if we were previously connected
            if (this.isConnected) {
              console.log('⚠️  Connection closed. Will reconnect when needed...');
            }
            this.isConnected = false;
            this.isConnecting = false;
            // Don't reset qrShown here - might need to show QR again
          } else {
            // Other close reasons
            this.isConnected = false;
            this.isConnecting = false;
            this.qrShown = false; // Reset to allow QR display
          }
        } else if (connection === 'open') {
          if (!this.isConnected) {
            console.log('\n✅ WhatsApp connected successfully!');
            const me = this.sock.user;
            if (me) {
              console.log(`👤 Logged in as: ${me.name || me.id}`);
            }
            console.log('✓ Session saved. You won\'t need to scan QR code again.\n');
          }
          this.isConnected = true;
          this.isConnecting = false;
          this.qrShown = false; // Reset for next time
        } else if (connection === 'connecting') {
          // Only log if not already connecting
          if (!this.isConnecting) {
            console.log('🔄 Connecting to WhatsApp...');
          }
        }
      });

      // Handle messages (optional - for future use)
      this.sock.ev.on('messages.upsert', ({ messages }) => {
        // Handle incoming messages if needed in future
      });

    } catch (error) {
      console.error('❌ Error initializing WhatsApp:', error);
      this.isConnected = false;
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Send WhatsApp message to admin
   * @param {string} message - Message to send
   * @param {string} imagePath - Optional path to image/screenshot to send
   * @returns {Promise<boolean>} - Success status
   */
  async sendMessage(message, imagePath = null) {
    try {
      // Ensure connected
      if (!this.isConnected || !this.sock) {
        console.log('⚠️  Not connected. Attempting to connect...');
        await this.initialize();

        // Wait for connection with timeout
        let attempts = 0;
        while (!this.isConnected && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        if (!this.isConnected) {
          throw new Error('Failed to establish WhatsApp connection');
        }
      }

      if (!this.adminPhoneNumber) {
        throw new Error('Admin phone number not configured');
      }

      // Format phone number (ensure @c.us suffix)
      let phoneNumber = this.adminPhoneNumber.trim();

      // Remove any non-digit characters except +
      phoneNumber = phoneNumber.replace(/[^\d+]/g, '');

      // Remove + if present and add country code if needed
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }

      // Ensure it ends with @c.us
      if (!phoneNumber.endsWith('@c.us') && !phoneNumber.endsWith('@s.whatsapp.net')) {
        phoneNumber = phoneNumber + '@c.us';
      }

      // If image path is provided, send image with caption
      if (imagePath && fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        await this.sock.sendMessage(phoneNumber, {
          image: imageBuffer,
          caption: message
        });
        console.log(`✅ Message with screenshot sent to admin (${phoneNumber})`);
      } else {
        // Send text message only
        await this.sock.sendMessage(phoneNumber, { text: message });
        console.log(`✅ Message sent to admin (${phoneNumber})`);
      }

      return true;

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);

      // Try to reconnect on error
      if (error.message.includes('Connection') || error.message.includes('socket')) {
        this.isConnected = false;
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => this.initialize(), 3000);
      }

      throw error;
    }
  }

  /**
   * Clear WhatsApp session (forces new QR on next connect)
   */
  clearSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        console.log('🗑️  Session cleared. Next connection will require new QR scan.');
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export singleton instance
module.exports = new WhatsAppService();

