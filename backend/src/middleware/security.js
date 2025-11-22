const express = require('express');

/**
 * Security middleware configuration
 */
function setupSecurityMiddleware(app) {
  // Try to use helmet if available
  try {
    const helmet = require('helmet');
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));
  } catch (error) {
    // Helmet not installed, skip
  }

  // Rate limiting (if express-rate-limit is available)
  try {
    const rateLimit = require('express-rate-limit');
    const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    const limiter = rateLimit({
      windowMs: rateLimitWindow,
      max: rateLimitMax,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting to all API routes
    app.use('/api', limiter);
    app.use('/website', limiter);
  } catch (error) {
    // express-rate-limit not installed, skip
  }
}

/**
 * CORS configuration
 */

module.exports = {
  setupSecurityMiddleware,
  setupCORS
};

