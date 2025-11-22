/**
 * Environment variable validation
 */

const { logger } = require('./logger');

/**
 * Required environment variables (optional in development)
 */
const REQUIRED_ENV_VARS = {
  production: [],
  development: [],
  test: []
};

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  PORT: { default: 3000, type: 'number' },
  NODE_ENV: { default: 'development', type: 'string' },
  LOG_LEVEL: { default: 'info', type: 'string' },
  HEADLESS: { default: 'true', type: 'string' },
  BROWSER_TIMEOUT: { default: '30000', type: 'number' },
  SOCIAL_MEDIA_TIMEOUT: { default: '60000', type: 'number' },
  MAX_RETRIES: { default: '3', type: 'number' },
  RETRY_DELAY: { default: '5000', type: 'number' },
  CORS_ORIGIN: { default: '*', type: 'string' },
  RATE_LIMIT_WINDOW_MS: { default: '900000', type: 'number' },
  RATE_LIMIT_MAX_REQUESTS: { default: '100', type: 'number' }
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const errors = [];
  const warnings = [];

  // Check required variables
  const required = REQUIRED_ENV_VARS[nodeEnv] || [];
  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`Required environment variable ${varName} is not set`);
    }
  }

  // Validate optional variables
  for (const [varName, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[varName];

    if (value !== undefined) {
      // Type validation
      if (config.type === 'number') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          warnings.push(`Environment variable ${varName} should be a number, using default: ${config.default}`);
          process.env[varName] = config.default;
        }
      }
    } else {
      // Set default value
      process.env[varName] = config.default;
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }

  // Log errors and exit if in production
  if (errors.length > 0) {
    errors.forEach(error => logger.error(error));

    if (nodeEnv === 'production') {
      logger.error('Missing required environment variables. Exiting...');
      process.exit(1);
    } else {
      logger.warn('Missing required environment variables (non-production mode, continuing anyway)');
    }
  }

  // Log environment info
  logger.info(`Environment: ${nodeEnv}`);
  logger.info(`Port: ${process.env.PORT}`);
  logger.info(`Log Level: ${process.env.LOG_LEVEL}`);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  validateEnvironment
};

