
const commands = {
  hello: async (message, args) => {
    await message.channel.send('hi');
    console.log(`User ${message.author.tag} used +hello`);
  },

  quote: async (message, args) => {
    if (!message.reference) return;
    try {
      const originalMsg = await message.channel.messages.fetch(message.reference.messageId);
      console.log('Message reference:', message.reference);
      console.log('Referenced message:', {
        content: originalMsg.content,
        author: originalMsg.author.username,
        messageId: originalMsg.id,
        isBot: originalMsg.author.bot
      });

      if (originalMsg.author.id === message.author.id && originalMsg.author.bot) {
        console.log('Attempted to quote bot\'s own message');
        await message.reply('Cannot quote my own messages!');
        return;
      }

      let text = originalMsg.content ? originalMsg.content.trim() : '';
      const displayName = originalMsg.author.globalName || originalMsg.author.username || 'Unknown Author';
      const username = originalMsg.author.username || 'unknown';

      if (!text || text.length === 0 || text.startsWith('+')) {
        console.log('Invalid text detected:', { text });
        await message.reply('Cannot quote an empty message or a command!');
        return;
      }

      let avatarUrl = originalMsg.author.avatarURL({ dynamic: false, size: 128 });
      if (avatarUrl) {
        avatarUrl = avatarUrl.split('?')[0];
      } else {
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${originalMsg.author.discriminator % 5}.png`;
      }

      console.log('Input for Voids API:', { text, displayName, username, avatarUrl });

      const requestBody = {
        username: username,
        display_name: displayName,
        text: text,
        avatar: avatarUrl,
        color: true
      };

      const apiResponse = await fetch('https://api.voids.top/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('API Error Details:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          body: errorBody
        });
        await message.reply(`API error: ${errorBody || 'Bad request - check logs for details.'}`);
        return;
      }

      const apiData = await apiResponse.json();
      console.log('API response:', apiData);

      if (!apiData.success || !apiData.url) {
        console.error('Invalid API response:', apiData);
        await message.reply('Failed to generate quote image from API.');
        return;
      }

      const imageResponse = await fetch(apiData.url);
      if (!imageResponse.ok) {
        console.error('Image download failed:', {
          status: imageResponse.status,
          statusText: imageResponse.statusText
        });
        await message.reply('Failed to download quote image.');
        return;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      const attachment = new MessageAttachment(buffer, 'quote.png');
      await message.reply({ files: [attachment] });
      console.log(`User ${message.author.tag} used +quote`);
    } catch (error) {
      console.error('Error processing +quote:', error);
      await message.reply('Something went wrong generating the quote.');
    }
  },

  fox: async (message, args) => {
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
  },

  cat: async (message, args) => {
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
  },

  dog: async (message, args) => {
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
  },

  help: async (message, args) => {
    const helpText = `
**Available Commands:**
- \`+hello\` - hello world
- \`+ping\` - pingle
- \`+help\` - shows this help message
- \`+fox\` - get picture of fox
- \`+cat\` - get picture of cat
- \`+dog\` - get picture of dog
- \`+gif\` - send random gif
- \`+gay <@user>\` - find how much gay someone is
- \`+lesbians <@user>\` - find how much lesbians someone is
- \`+burn <text>\` - burning text
- \`+quote\` - quote a message (reply to someone)
    `;
    await message.channel.send(helpText);
  },

  ping: async (message, args) => {
    console.log(`User ${message.author.tag} used +ping`);
    await message.channel.send('pingle');
  },

  gif: async (message, args) => {
    const responses = [
      'https://tenor.com/view/df-hh-gif-26247943',
      'https://tenor.com/view/mr-utah-dance-gif-11499022268151868481',
      'https://cdn.discordapp.com/attachments/1295104679918829639/1390878729458290750/twitter_1940972343406600328.gif?ex=68f8e702&is=68f79582&hm=986417ca523ab939850a3d82249ffb5fa6e14f37a1f2ca4e007d6e1b67e2c16e&',
      'https://tenor.com/view/kurt-cobain-nirvana-grunge-kurt-cobain-gif-26486856',
      'https://tenor.com/view/cat-cat-looking-around-looking-around-orange-cat-doom-1993-gif-1032019449693505825',
      'https://tenor.com/view/keemxdaxtruth-lmao-dead-nope-gif-14774804',
      'https://tenor.com/view/bro-just-typing-shit-atm-man-funny-tiktok-gif-6754206601808444804',
      'https://tenor.com/view/cat-gif-22201828',
      'https://cdn.discordapp.com/attachments/1356028858758987929/1395288902780059680/Tumblr_l_2976258243386051.gif?ex=68f288cd&is=68f1374d&hm=480fdeec339dade188e0ab6b1359b7fcad9edf73ff52cac9c75fa1c07e7697d5&',
      'https://tenor.com/view/we-got-this-we-can-do-it-lets-do-this-its-go-time-gif-18162766352197200050',
      'https://cdn.discordapp.com/attachments/1236480298225500270/1312810679257796648/9F6DF7B0-AE36-495E-84F6-3BCB85D43273.gif?ex=68f26838&is=68f116b8&hm=b0bbe8d8ed8590a5120d6f072c973c5253dafcbb6d73c4fe86bd4a5840c5d17f&',
      'https://tenor.com/view/bedankt-stemmen-d66-gif-20750336',
      'https://tenor.com/view/blue-protocol-discord-everyday-xp-rank-2-gif-15559150468971950141',
      'https://tenor.com/view/basketball-miss-failure-fail-gif-24912602',
      'https://cdn.discordapp.com/attachments/1324276331026055273/1397803254062120970/attachment.gif?ex=68f273f9&is=68f12279&hm=2d94d68e15c413a76c6ffec49a7ff3c977143a7a141937fbda7972c1a1042572&',
      'https://cdn.discordapp.com/attachments/1018055445279154218/1402821050319769651/image0.gif?ex=68f2e8e9&is=68f19769&hm=2e96ad6024a20e7f6a91713cb9e409bbe2646dcf00a671ae318802da18f2a0f7&',
      'https://cdn.discordapp.com/attachments/1324276331026055273/1382596101038801036/twitter_1932477189649297556.gif?ex=68f28035&is=68f12eb5&hm=556efb2430856c411bbb1f01068205d6c1793894177703ccddf9e13c7a4c81e1&',
      'https://cdn.discordapp.com/attachments/1018055445279154217/1390017579443294208/uncaption.gif?ex=68f3cac0&is=68f27940&hm=e55070068622591aa75ea39e97be9515fb20867702e24b65faf256823e52da44&'
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await message.channel.send(randomResponse);
    console.log(`User ${message.author.tag} used +gif with gif ${randomResponse}`);
  },

  burn: async (message, args) => {
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
  },

  gay: async (message, args) => {
    if (args.length === 0) {
      await message.channel.send('Please mention a user, e.g., +gay @person');
      return;
    }
    const mention = args[0];
    if (!mention.match(/^<@!?[0-9]+>$/)) {
      await message.channel.send('Please provide a valid user mention, e.g., +gay @person');
      return;
    }
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    await message.channel.send(`${mention} is **${randomNumber}%** gay`);
    console.log(`User ${message.author.tag} used +gay with mention ${mention}`);
  },

  lesbians: async (message, args) => {
    if (args.length === 0) {
      await message.channel.send('Please mention a user, e.g., +lesbians @person');
      return;
    }
    const mention = args[0];
    if (!mention.match(/^<@!?[0-9]+>$/)) {
      await message.channel.send('Please provide a valid user mention, e.g., +lesbians @person');
      return;
    }
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    await message.channel.send(`${mention} is **${randomNumber}%** lesbians`);
    console.log(`User ${message.author.tag} used +lesbians with mention ${mention}`);
  }
};

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;
  if (!message.content.startsWith('+')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (commands[command]) {
    await commands[command](message, args);
  }
});

module.exports = commands;
