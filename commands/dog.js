module.exports = async (message, args, context) => {
  console.log(`User ${message.author.tag} used +dog`);
  try {
    const response = await fetch('https://api.thedogapi.com/v1/images/search');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    const dogImage = jsonResponse[0].url;
    console.log('Dog image URL:', dogImage);
    message.channel.send(dogImage);
  } catch (error) {
    console.error('Error fetching or parsing data:', error.message);
    message.channel.send('Sorry, I couldn’t fetch a dog image right now!');
  }
};
