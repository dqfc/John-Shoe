module.exports = async (message, args, context) => {
  if (args.length === 0) {
    await message.channel.send('Please provide text, e.g., +burn MyText');
    return;
  }
  const text = args.join(' ');
  try {
    const cooltextResponse = await fetch("https://cooltext.com/PostChange", {
      "credentials": "include",
      "headers": {
        "User-Agent": "Jordan/1.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      "referrer": "https://cooltext.com/Logo-Design-Burning",
      "body": `LogoID=4&Text=${encodeURIComponent(text)}&FontSize=70&Color1_color=%23FF0000&Integer1=15&Boolean1=on&Integer9=0&Integer13=on&Integer12=on&BackgroundColor_color=%23FFFFFF`,
      "method": "POST",
      "mode": "cors"
    });
    const cooltextData = await cooltextResponse.json();
    if (!cooltextData.renderLocation) {
      await message.channel.send('Error: Could not generate image link');
      console.log(`Error: No renderLocation in response for +burn by ${message.author.tag}`);
      return;
    }
    const uploadResponse = await fetch("https://0x0.st", {
      "method": "POST",
      "headers": {
        "User-Agent": "Jordan/1.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      "body": `url=${encodeURIComponent(cooltextData.renderLocation)}`
    });
    const uploadLink = await uploadResponse.text();
    if (!uploadLink.startsWith('https://0x0.st/')) {
      await message.channel.send('Error: Failed to upload image to 0x0.st');
      console.log(`Error: Invalid 0x0.st response for +burn by ${message.author.tag}: ${uploadLink}`);
      return;
    }
    await message.channel.send(uploadLink);
    console.log(`User ${message.author.tag} used +burn with text "${text}", uploaded to ${uploadLink}`);
  } catch (error) {
    await message.channel.send('Error: Failed to process burn command');
    console.error(`Error in +burn for ${message.author.tag}:`, error);
  }
};
