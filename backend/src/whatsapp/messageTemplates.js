/**
 * WhatsApp message templates for RTI website alerts
 */

const templates = [
  '⚠️ *ALERT: RTI Website DOWN*\n\n🌐 *Website:* {websiteName}\n🔗 *URL:* {websiteUrl}\n❌ *Error:* {error}\n⏰ *Time:* {time}\n\nThis affects citizens trying to file RTI applications. Please check and fix urgently!',

  '🚨 *RTI Portal Issue Detected*\n\n📍 *Site:* {websiteName}\n🔗 *Link:* {websiteUrl}\n⚠️ *Status:* {error}\n🕐 *Checked:* {time}\n\nCitizens cannot submit RTI applications. Immediate attention required!',

  '❌ *Website Not Accessible*\n\n🏛️ *Portal:* {websiteName}\n🌐 *URL:* {websiteUrl}\n🔴 *Issue:* {error}\n⏱️ *Time:* {time}\n\nRTI filing system is down. Please restore service!',

  '⚠️ *Service Disruption Alert*\n\n📋 *Website:* {websiteName}\n🔗 *Address:* {websiteUrl}\n❌ *Problem:* {error}\n🕒 *Detected:* {time}\n\nRight to Information portal is not working. Urgent fix needed!'
];

function getRandomTemplate() {
  return templates[Math.floor(Math.random() * templates.length)];
}

function formatMessage(website, error, status) {
  const template = getRandomTemplate();
  const now = new Date();
  const timeString = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let message = template
    .replace('{websiteName}', website.name)
    .replace('{websiteUrl}', website.url)
    .replace('{error}', error || 'Unknown error')
    .replace('{status}', status || 'ERROR')
    .replace('{time}', timeString);

  return message;
}

module.exports = {
  formatMessage
};


