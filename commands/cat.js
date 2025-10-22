module.exports = async (message, args, context) => {
  console.log(`User ${message.author.tag} used +cat`);
  try {
    const response = await fetch('https://api.thecatapi.com/v1/images/search');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    const catImage = jsonResponse[0].url;
    console.log('Cat image URL:', catImage);
    message.channel.send(catImage);
  } catch (error) {
    console.error('Error fetching or parsing data:', error.message);
    message.channel.send('Sorry, I couldn’t fetch a cat image right now!');
  }
};
