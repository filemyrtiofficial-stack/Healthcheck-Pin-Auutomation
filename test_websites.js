const fs = require('fs');
const path = require('path');

function loadWebsites() {
  const WEBSITES_FILE = path.join(__dirname, 'config/websites.json');
  console.log('WEBSITES_FILE path:', WEBSITES_FILE);
  console.log('File exists:', fs.existsSync(WEBSITES_FILE));

  try {
    if (fs.existsSync(WEBSITES_FILE)) {
      const data = fs.readFileSync(WEBSITES_FILE, 'utf8');
      const websites = JSON.parse(data);
      console.log('Loaded websites from config:');
      websites.forEach((w, i) => {
        console.log(`${i}: ${w.name} - ${w.url}`);
      });
      console.log(`Total: ${websites.length} websites`);

      // Check for Punjab
      const punjabWebsite = websites.find(w => w.url.includes('punjab'));
      if (punjabWebsite) {
        console.log('FOUND PUNJAB WEBSITE:', punjabWebsite);
      } else {
        console.log('Punjab website NOT found in config');
      }

      return websites;
    } else {
      console.log('Config file does not exist, using defaults');
      return [];
    }
  } catch (error) {
    console.error('Error loading websites:', error);
    return [];
  }
}

loadWebsites();
