const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'automation.log');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function formatMessage(level, message, error = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (error && error.stack) {
    logMessage += `\n${error.stack}`;
  }

  return logMessage;
}

// Flag to suppress console output (for clean terminal display)
let suppressConsole = false;

function setSuppressConsole(value) {
  suppressConsole = value;
}

function writeLog(level, message, error = null) {
  if (levels[level] <= levels[LOG_LEVEL]) {
    const logMessage = formatMessage(level, message, error);

    // Console output (only if not suppressed)
    if (!suppressConsole) {
      if (level === 'error') {
        console.error(logMessage);
      } else if (level === 'warn') {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    }

    // Always write to file
    try {
      fs.appendFileSync(logFile, logMessage + '\n');
    } catch (err) {
      if (!suppressConsole) {
        console.error(`Failed to write to log file: ${err.message}`);
      }
    }
  }
}

const logger = {
  error: (message, error = null) => writeLog('error', message, error),
  warn: (message, error = null) => writeLog('warn', message, error),
  info: (message, error = null) => writeLog('info', message, error),
  debug: (message, error = null) => writeLog('debug', message, error)
};

module.exports = { logger, setSuppressConsole };



