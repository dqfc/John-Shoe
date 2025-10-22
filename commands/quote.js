const { MessageAttachment } = require('discord.js-selfbot-v13');

module.exports = async (message, args, context) => {
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
};
