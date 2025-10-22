const https = require('https');

module.exports = async (message, args, context) => {
  console.log(`User ${message.author.tag} used +fox`);
  https.get('https://randomfox.ca/floof/', (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const jsonResponse = JSON.parse(data);
        const foximage = jsonResponse.image;
        console.log('Fox image URL:', foximage);
        message.channel.send(foximage);
      } catch (error) {
        console.error('Error parsing JSON:', error.message);
      }
    });
  }).on('error', (error) => {
    console.error('Error making GET request:', error.message);
  });
};
