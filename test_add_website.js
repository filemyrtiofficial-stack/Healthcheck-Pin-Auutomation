const axios = require('axios');

async function testAddWebsite() {
  try {
    console.log('Testing add website functionality...');

    // First, get current websites
    console.log('Getting current websites...');
    const getResponse = await axios.get('http://localhost:3000/api/websites');
    console.log('Current websites:', getResponse.data);

    // Try to add Punjab RTI
    console.log('Adding Punjab RTI website...');
    const addResponse = await axios.post('http://localhost:3000/api/websites', {
      name: 'Punjab RTI',
      url: 'https://rti.punjab.gov.in/'
    });
    console.log('Add response:', addResponse.data);

    // Get websites again to verify it was added
    console.log('Getting websites after addition...');
    const getResponse2 = await axios.get('http://localhost:3000/api/websites');
    console.log('Websites after addition:', getResponse2.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAddWebsite();
