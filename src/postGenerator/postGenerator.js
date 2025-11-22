const templates = require('./templates');
const socialMediaTemplates = require('./socialMediaTemplates');

/**
 * Generate a social media post message for a down website (legacy - simple format)
 */
function generatePost(website, status, error) {
  const template = templates.getRandomTemplate();

  // Replace placeholders
  let message = template
    .replace('{websiteName}', website.name)
    .replace('{websiteUrl}', website.url)
    .replace('{status}', status || 'ERROR')
    .replace('{error}', error || 'Unknown error');

  // Add hashtags
  const hashtags = ['#RTI', '#RightToInformation', '#GovernmentTransparency', '#DigitalIndia'];
  message += '\n\n' + hashtags.join(' ');

  return message;
}

/**
 * Generate social media-ready post with screenshot placeholder
 * @param {Object} website - Website object with name and url
 * @param {string} status - Status code or null
 * @param {string} error - Error message
 * @param {string} screenshotPath - Path to screenshot (optional)
 * @param {string} platform - 'whatsapp', 'twitter', 'facebook', 'instagram', 'linkedin'
 * @returns {string} - Formatted message
 */
function generateSocialMediaPost(website, status, error, screenshotPath = null, platform = 'whatsapp') {
  const now = new Date();
  const timeString = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format screenshot placeholder
  let screenshotPlaceholder = '';
  if (screenshotPath) {
    // For markdown/image formats
    if (platform === 'facebook' || platform === 'instagram' || platform === 'linkedin') {
      screenshotPlaceholder = `[Screenshot: ${screenshotPath}]`;
    } else {
      screenshotPlaceholder = `📸 Screenshot available: ${screenshotPath}`;
    }
  } else {
    screenshotPlaceholder = '[Screenshot will be attached]';
  }

  // Select template based on platform
  let template = '';
  if (platform === 'whatsapp' || platform === 'twitter') {
    template = platform === 'whatsapp'
      ? socialMediaTemplates.short.whatsapp
      : socialMediaTemplates.short.twitter;
  } else if (platform === 'facebook' || platform === 'instagram') {
    template = platform === 'facebook'
      ? socialMediaTemplates.medium.facebook
      : socialMediaTemplates.medium.instagram;
  } else {
    template = socialMediaTemplates.long.linkedin;
  }

  // Replace placeholders
  let message = template
    .replace(/{{WEBSITE_NAME}}/g, website.name)
    .replace(/{{URL}}/g, website.url)
    .replace(/{{STATUS}}/g, error || status || 'DOWN')
    .replace(/{{TIME}}/g, timeString)
    .replace(/{{SCREENSHOT}}/g, screenshotPlaceholder);

  return message;
}

/**
 * Get all format versions for a down website
 */
function getAllFormats(website, status, error, screenshotPath = null) {
  return {
    whatsapp: generateSocialMediaPost(website, status, error, screenshotPath, 'whatsapp'),
    twitter: generateSocialMediaPost(website, status, error, screenshotPath, 'twitter'),
    facebook: generateSocialMediaPost(website, status, error, screenshotPath, 'facebook'),
    instagram: generateSocialMediaPost(website, status, error, screenshotPath, 'instagram'),
    linkedin: generateSocialMediaPost(website, status, error, screenshotPath, 'linkedin')
  };
}

module.exports = {
  generatePost,
  generateSocialMediaPost,
  getAllFormats
};



