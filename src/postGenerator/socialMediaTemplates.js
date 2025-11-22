/**
 * Social Media Ready RTI Portal Down Alert Templates
 * Multiple formats for different platforms
 */

const templates = {
  // SHORT VERSION - For WhatsApp & Twitter/X (280 chars limit)
  short: {
    whatsapp: `🚨 *RTI Portal Issue Detected*

*{{WEBSITE_NAME}}*
🔗 {{URL}}
❌ Status: {{STATUS}}
⏰ Checked: {{TIME}}

{{SCREENSHOT}}

⚠️ Official portal seems down. You can temporarily use our private RTI filing portal 👉 *https://filemyrti.com*

#RTI #RightToInformation #GovernmentTransparency`,

    twitter: `🚨 RTI Portal Issue Detected

{{WEBSITE_NAME}}
🔗 {{URL}}
❌ Status: {{STATUS}}
⏰ Checked: {{TIME}}

{{SCREENSHOT}}

⚠️ Official portal seems down. You can temporarily use our private RTI filing portal 👉 https://filemyrti.com

#RTI #RightToInformation #GovernmentTransparency`
  },

  // MEDIUM VERSION - For Facebook & Instagram
  medium: {
    facebook: `🚨 RTI Portal Issue Detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Website: {{WEBSITE_NAME}}
🔗 URL: {{URL}}
❌ Status: {{STATUS}}
⏰ Time Checked: {{TIME}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 Screenshot:
{{SCREENSHOT}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Official portal seems down. You can temporarily use our private RTI filing portal 👉 https://filemyrti.com

This affects citizens trying to file RTI applications. Please check and fix urgently!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#RTI #RightToInformation #GovernmentTransparency #DigitalIndia #CitizenRights`,

    instagram: `🚨 RTI Portal Issue Detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Website: {{WEBSITE_NAME}}
🔗 URL: {{URL}}
❌ Status: {{STATUS}}
⏰ Time Checked: {{TIME}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 Screenshot:
{{SCREENSHOT}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Official portal seems down. You can temporarily use our private RTI filing portal 👉 https://filemyrti.com

This affects citizens trying to file RTI applications. Please check and fix urgently!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#RTI #RightToInformation #GovernmentTransparency #DigitalIndia #CitizenRights #RTIPortal #GovernmentAccountability`
  },

  // LONG VERSION - For LinkedIn
  long: {
    linkedin: `🚨 RTI Portal Issue Detected - Immediate Action Required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Website: {{WEBSITE_NAME}}
🔗 URL: {{URL}}
❌ Status: {{STATUS}}
⏰ Time Checked: {{TIME}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 Screenshot:
{{SCREENSHOT}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Official portal seems down. You can temporarily use our private RTI filing portal 👉 https://filemyrti.com

This affects citizens trying to file RTI applications. Please check and fix urgently!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#RTI #RightToInformation #GovernmentTransparency #DigitalIndia #CitizenRights #RTIPortal #GovernmentAccountability #PublicService #Transparency`
  }
};

module.exports = templates;

