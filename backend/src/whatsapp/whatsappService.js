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
    this.connectingTimeout = null; // Timeout for connecting state
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

      // Create WhatsApp socket with better connection options
      this.sock = makeWASocket({
        version,
        printQRInTerminal: false, // We'll handle QR manually with better formatting
        auth: state,
        logger: pino({ level: 'silent' }), // Suppress default logs
        browser: ['WhatsApp Notification Bot', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        // Connection options to prevent timeouts during authentication
        // Increased timeouts to allow more time for authentication after QR scan
        connectTimeoutMs: 120_000, // 120 seconds (2 minutes) - increased for QR authentication
        defaultQueryTimeoutMs: 120_000, // 120 seconds (2 minutes)
        keepAliveIntervalMs: 10_000, // 10 seconds
        // Retry connection on failure
        retryRequestDelayMs: 1000, // Increased from 250ms to 1s for better stability
        maxMsgRetryCount: 5, // Increased retry count
        // Mark online to keep connection alive
        markOnlineOnConnect: true,
        // Additional options for better connection stability
        syncFullHistory: false, // Don't sync full history on connect (faster)
        fireInitQueries: true, // Fire initialization queries
        shouldSyncHistoryMessage: () => false, // Don't sync history messages
        shouldIgnoreJid: () => false
      });

      // Save credentials when updated - CRITICAL for session persistence
      this.sock.ev.on('creds.update', async () => {
        try {
          await saveCreds();
          console.log('💾 Credentials saved successfully');
        } catch (error) {
          console.error('❌ Error saving credentials:', error);
        }
      });

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Display QR code - handle refresh if QR expires
        if (qr) {
          // Force console output to ensure QR is visible
          console.log('\n');
          console.log('═══════════════════════════════════════════════════════');

          // Clear previous QR display if refreshing
          if (this.qrShown) {
            console.log('🔄 QR code refreshed. Please scan the new QR code:');
          } else {
            console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
          }

          console.log('═══════════════════════════════════════════════════════');
          console.log('');

          // Generate QR code in terminal - ensure it's visible
          try {
            qrcode.generate(qr, { small: true });
            console.log('');
          } catch (qrError) {
            console.error('❌ Error generating QR code:', qrError.message);
            console.log('\n📱 QR Code String (use online QR generator):');
            console.log(qr);
            console.log('');
          }

          if (!this.qrShown) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('📋 Instructions:');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Go to Settings → Linked Devices');
            console.log('3. Tap "Link a Device"');
            console.log('4. Scan the QR code above');
            console.log('═══════════════════════════════════════════════════════');
            console.log('\n⏳ Waiting for QR scan...\n');
          }

          this.qrShown = true;
        }

        // Handle connection status
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = (statusCode !== DisconnectReason.loggedOut);
          const wasLoggedOut = (statusCode === DisconnectReason.loggedOut);
          const wasConnectionClosed = (statusCode === DisconnectReason.connectionClosed);
          const wasConnectionLost = (statusCode === DisconnectReason.connectionLost);
          const wasTimedOut = (statusCode === DisconnectReason.timedOut);
          const wasBadSession = (statusCode === DisconnectReason.badSession);
          // Check for restart required (status code 515) - WhatsApp sometimes requires restart
          const wasRestartRequired = (statusCode === 515 || (DisconnectReason.restartRequired && statusCode === DisconnectReason.restartRequired));

          // Log detailed error information
          if (lastDisconnect?.error) {
            console.log('\n⚠️  Connection closed. Details:');
            console.log(`   Status Code: ${statusCode}`);
            console.log(`   Error: ${lastDisconnect.error.message || JSON.stringify(lastDisconnect.error)}`);

            // Provide helpful messages for common errors
            if (wasTimedOut) {
              console.log('   💡 Connection timed out. This might happen during QR authentication.');
              console.log('   💡 Try scanning the QR code again if it\'s still showing.');
            } else if (wasConnectionLost || wasConnectionClosed) {
              console.log('   💡 Connection lost. This might be a network issue.');
              console.log('   💡 The connection will be retried automatically.');
            } else if (wasRestartRequired) {
              console.log('   💡 WhatsApp requires a restart. Reconnecting...');
            }
          }

          if (wasLoggedOut || wasBadSession) {
            console.log('\n❌ Session invalid or logged out. Clearing session to generate new QR code...');
            this.isConnected = false;
            this.isConnecting = false;
            this.qrShown = false; // Reset to show new QR

            // Clear session files to force new QR generation
            try {
              if (fs.existsSync(this.sessionPath)) {
                const files = fs.readdirSync(this.sessionPath);
                files.forEach(file => {
                  if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.sessionPath, file));
                  }
                });
                console.log('🗑️  Session cleared. New QR code will be generated on next initialization.\n');
              }
            } catch (error) {
              console.error('Error clearing session:', error);
            }
          } else if (wasRestartRequired) {
            // WhatsApp requires restart - reconnect automatically
            console.log('🔄 WhatsApp requires restart. Reconnecting automatically...');
            this.isConnected = false;
            this.isConnecting = false;
            // Don't clear session - just reconnect
            // Auto-reconnect after a short delay
            setTimeout(() => {
              if (!this.isConnected && !this.isConnecting) {
                console.log('🔄 Attempting automatic reconnection...');
                this.initialize().catch(err => {
                  console.error('❌ Auto-reconnect failed:', err.message);
                });
              }
            }, 3000);
          } else if (wasConnectionClosed || wasConnectionLost || wasTimedOut) {
            // Network issues - might recover
            // Don't log if we're still in the connecting phase (after QR scan)
            if (this.isConnected) {
              console.log('⚠️  Connection lost. This might be temporary. Will attempt to reconnect...');
            }
            this.isConnected = false;
            // Keep isConnecting true if we were in the middle of authentication
            // This allows the connection to continue trying
            if (!this.qrShown) {
              this.isConnecting = false;
            }
            // Don't clear session - might reconnect
          } else if (shouldReconnect) {
            // Only log reconnection if we were previously connected
            if (this.isConnected) {
              console.log('⚠️  Connection closed. Will reconnect when needed...');
            }
            this.isConnected = false;
            // Keep connecting state if QR was shown (authentication in progress)
            if (!this.qrShown) {
              this.isConnecting = false;
            }
            // Don't reset qrShown here - might need to show QR again
          } else {
            // Other close reasons
            console.log('⚠️  Connection closed for unknown reason. Status code:', statusCode);
            this.isConnected = false;
            this.isConnecting = false;
            this.qrShown = false; // Reset to allow QR display
          }
        } else if (connection === 'open') {
          // Clear connecting timeout if set
          if (this.connectingTimeout) {
            clearTimeout(this.connectingTimeout);
            this.connectingTimeout = null;
          }

          if (!this.isConnected) {
            console.log('\n');
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ WHATSAPP CONNECTED SUCCESSFULLY!');
            console.log('═══════════════════════════════════════════════════════');
            const me = this.sock.user;
            if (me) {
              console.log(`👤 Logged in as: ${me.name || me.id}`);
            }
            console.log('✓ Session saved. You won\'t need to scan QR code again.');
            console.log('═══════════════════════════════════════════════════════\n');
          }
          this.isConnected = true;
          this.isConnecting = false;
          this.qrShown = false; // Reset for next time
        } else if (connection === 'connecting') {
          // Show connecting message with helpful info
          if (!this.isConnecting && !this.isConnected) {
            if (this.qrShown) {
              console.log('\n🔄 Authenticating... Please wait...');
              console.log('💡 If you just scanned the QR code, this may take 30-60 seconds.');
              console.log('💡 Do not close the terminal or interrupt the process.\n');
            } else {
              console.log('🔄 Connecting to WhatsApp... Please wait...\n');
            }
          }
          this.isConnecting = true;

          // Set a timeout to warn if connecting takes too long
          if (!this.connectingTimeout) {
            this.connectingTimeout = setTimeout(() => {
              if (this.isConnecting && !this.isConnected && this.qrShown) {
                console.log('\n⏳ Authentication is taking longer than expected...');
                console.log('💡 Make sure your phone has internet connection.');
                console.log('💡 If the QR code expired, a new one will be shown.\n');
              }
            }, 45000); // Warn after 45 seconds
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

