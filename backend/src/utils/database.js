const path = require('path');
const fs = require('fs');

// Get the correct logs directory path (works in both dev and production)
function getLogsDir() {
  // Try multiple possible locations (check for status file existence, not just directory)
  const possibleDirs = [
    path.join(__dirname, '../../logs'), // backend/src/utils -> backend/logs
    path.join(__dirname, '../../../logs'), // If running from different location
    path.join(process.cwd(), 'logs'), // Root logs directory
    path.join(process.cwd(), 'backend/logs') // Backend logs from root
  ];

  // First, check if status file exists in any of these directories
  for (const dir of possibleDirs) {
    const statusFile = path.join(dir, 'website_status.json');
    if (fs.existsSync(statusFile)) {
      return dir;
    }
  }

  // If status file doesn't exist, check if any of the directories exist
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  // If none exist, create the first one (most common case)
  const defaultDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

// Ensure logs directory exists
const logsDir = getLogsDir();
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const statusFile = path.join(logsDir, 'website_status.json');
const postsFile = path.join(logsDir, 'post_logs.json');

// Export the status file path so server.js can use it
function getStatusFilePath() {
  return statusFile;
}

// Initialize JSON files if they don't exist
function ensureFiles() {
  if (!fs.existsSync(statusFile)) {
    fs.writeFileSync(statusFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(postsFile)) {
    fs.writeFileSync(postsFile, JSON.stringify([], null, 2));
  }
}

// Read JSON file
function readJSON(filePath) {
  ensureFiles();
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Write JSON file
function writeJSON(filePath, data) {
  ensureFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Save website status check result
 */
function saveStatus(url, status, error) {
  const { logger } = require('./logger');
  logger.debug(`Saving status for ${url}: status=${status}, error=${error || 'none'}`);
  const statuses = readJSON(statusFile);

  const newEntry = {
    id: statuses.length + 1,
    url,
    status,
    error: error || null,
    checked_at: new Date().toISOString()
  };

  statuses.push(newEntry);

  // Keep only last 10000 entries to prevent file from growing too large
  if (statuses.length > 10000) {
    statuses.splice(0, statuses.length - 10000);
  }

  writeJSON(statusFile, statuses);
  logger.debug(`Status saved. Total entries: ${statuses.length}`);
}

/**
 * Get the last post time for a website
 */
function getLastPostTime(url) {
  const posts = readJSON(postsFile);
  const successfulPosts = posts
    .filter(p => p.url === url && p.status === 'success')
    .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

  return successfulPosts.length > 0 ? successfulPosts[0].posted_at : null;
}

/**
 * Save post log entry
 */
function savePostLog(url, message, status, error = null) {
  const posts = readJSON(postsFile);
  posts.push({
    id: posts.length + 1,
    url,
    message,
    status,
    error,
    posted_at: new Date().toISOString()
  });

  // Keep only last 1000 entries to prevent file from growing too large
  if (posts.length > 1000) {
    posts.splice(0, posts.length - 1000);
  }

  writeJSON(postsFile, posts);
}

module.exports = {
  saveStatus,
  getLastPostTime,
  savePostLog,
  getStatusFilePath
};
