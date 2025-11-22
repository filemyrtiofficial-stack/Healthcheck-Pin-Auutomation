const templates = [
  '⚠️ Alert: {websiteName} is currently DOWN! Status: {status} | Error: {error} | URL: {websiteUrl} | This affects citizens trying to file RTI applications. Please fix this issue urgently!',

  '🚨 {websiteName} website is not accessible! Status: {status} | Error: {error} | URL: {websiteUrl} | Citizens cannot submit RTI applications. Immediate action required!',

  '❌ {websiteName} RTI portal is experiencing issues! Status: {status} | Error: {error} | URL: {websiteUrl} | This is blocking transparency and citizen rights. Please restore service!',

  '⚠️ Service Disruption: {websiteName} is down! Status: {status} | Error: {error} | URL: {websiteUrl} | RTI applications cannot be filed. Urgent attention needed!',

  '🔴 {websiteName} website is unavailable! Status: {status} | Error: {error} | URL: {websiteUrl} | This impacts the Right to Information Act implementation. Please resolve immediately!',

  '⚠️ Technical Issue: {websiteName} RTI portal is not responding! Status: {status} | Error: {error} | URL: {websiteUrl} | Citizens are unable to exercise their RTI rights. Fix required!',

  '🚨 Alert: {websiteName} is offline! Status: {status} | Error: {error} | URL: {websiteUrl} | RTI filing system is down. This needs immediate resolution!',

  '❌ {websiteName} website access failed! Status: {status} | Error: {error} | URL: {websiteUrl} | Transparency portal is not working. Please restore access!'
];

function getRandomTemplate() {
  return templates[Math.floor(Math.random() * templates.length)];
}

module.exports = {
  getRandomTemplate
};



