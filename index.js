const { Client, MessageAttachment } = require('discord.js-selfbot-v13');
const Canvas = require('canvas');
const fs = require('fs');
const https = require('https');
const client = new Client({
  checkUpdate: false
});

// Your user token (example)
const TOKEN = 'MTI2MzMxNzc3MDc2Mjg1MDQxNg.GVDTp3.G3hIl3zYeMwLCXl9Quvoy41X0LPztIEf317bjw';

// Status rotation
const statuses = [
  { name: 'tort baller', type: 'PLAYING' },
  { name: 'Something New', type: 'LISTENING' },
  { name: '<- BORP', type: 'PLAYING' },
  { name: 'Hyooo', type: 'PLAYING' },
  { name: 'Routing', type: 'PLAYING' },
  { name: 'ivy route', type: 'WATCHING' },
  { name: '+help', type: 'WATCHING' },
  { name: 'how o computtr,. Faggot level 555', type: 'PLAYING' },
  { name: 'tort baller: the movie', type: 'WATCHING' }
];

function rotateStatus() {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  client.user.setPresence({
    activities: [{ name: status.name, type: status.type }],
    status: 'online'
  });
  console.log(`Updated status to: ${status.type} ${status.name}`);
}

// Boggle game state
let games = {}, words = {}, endTimes = {}, boards = {}, activeGames = {};

// CAH game state
let cahGames = {}, cahHands = {}, cahDecks = {}, cahCurrent = {}, cahActivePlayers = {}, customWhiteCards = [];

function loadState() {
  try {
    games = JSON.parse(fs.readFileSync('games.json', 'utf8')) || {};
    words = JSON.parse(fs.readFileSync('words.json', 'utf8')) || {};
    endTimes = JSON.parse(fs.readFileSync('endTimes.json', 'utf8')) || {};
    boards = JSON.parse(fs.readFileSync('boards.json', 'utf8')) || {};
    activeGames = JSON.parse(fs.readFileSync('activeGames.json', 'utf8')) || {};
    cahGames = JSON.parse(fs.readFileSync('cahGames.json', 'utf8')) || {};
    cahHands = JSON.parse(fs.readFileSync('cahHands.json', 'utf8')) || {};
    cahDecks = JSON.parse(fs.readFileSync('cahDecks.json', 'utf8')) || {};
    cahCurrent = JSON.parse(fs.readFileSync('cahCurrent.json', 'utf8')) || {};
    cahActivePlayers = JSON.parse(fs.readFileSync('cahActivePlayers.json', 'utf8')) || {};
    customWhiteCards = JSON.parse(fs.readFileSync('customWhiteCards.json', 'utf8')) || [];
  } catch (e) {
    console.error('Failed to load state files:', e.message);
    ['games.json', 'words.json', 'endTimes.json', 'boards.json', 'activeGames.json', 'cahGames.json', 'cahHands.json', 'cahDecks.json', 'cahCurrent.json', 'cahActivePlayers.json', 'customWhiteCards.json'].forEach(file => {
      fs.writeFileSync(file, file === 'customWhiteCards.json' ? '[]' : '{}');
    });
  }
}

function saveState() {
  fs.writeFileSync('games.json', JSON.stringify(games));
  fs.writeFileSync('words.json', JSON.stringify(words));
  fs.writeFileSync('endTimes.json', JSON.stringify(endTimes));
  fs.writeFileSync('boards.json', JSON.stringify(boards));
  fs.writeFileSync('activeGames.json', JSON.stringify(activeGames));
  fs.writeFileSync('cahGames.json', JSON.stringify(cahGames));
  fs.writeFileSync('cahHands.json', JSON.stringify(cahHands));
  fs.writeFileSync('cahDecks.json', JSON.stringify(cahDecks));
  fs.writeFileSync('cahCurrent.json', JSON.stringify(cahCurrent));
  fs.writeFileSync('cahActivePlayers.json', JSON.stringify(cahActivePlayers));
  fs.writeFileSync('customWhiteCards.json', JSON.stringify(customWhiteCards));
}

loadState();

async function isValidEnglishWord(word) {
  try {
    const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d`);
    if (!response.ok) {
      console.error(`Datamuse API error for word "${word}": Status ${response.status}`);
      return false;
    }
    const data = await response.json();
    console.log(`Datamuse response for "${word}":`, JSON.stringify(data, null, 2));
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No results for word "${word}"`);
      return false;
    }
    return data.some(entry => {
      if (!entry.word || typeof entry.tags !== 'object' || !Array.isArray(entry.tags)) {
        console.log(`Invalid entry for "${word}":`, entry);
        return entry.word.toLowerCase() === word.toLowerCase();
      }
      return entry.word.toLowerCase() === word.toLowerCase() && entry.tags.includes('n');
    });
  } catch (error) {
    console.error(`Error validating word "${word}" with Datamuse:`, error.message);
    return false;
  }
}

// Boggle game logic
function isValidWord(board, word) {
  word = word.toLowerCase().trim();
  if (word.length < 3) return false;
  function dfs(x, y, index, visited) {
    if (index === word.length) return true;
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (let [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4 && !visited.has(key) && board[nx][ny].toLowerCase() === word[index]) {
        visited.add(key);
        if (dfs(nx, ny, index + 1, visited)) return true;
        visited.delete(key);
      }
    }
    return false;
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j].toLowerCase() === word[0]) {
        if (dfs(i, j, 1, new Set([`${i},${j}`]))) return true;
      }
    }
  }
  return false;
}

async function createBoardImage(board) {
  const canvas = Canvas.createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 100, 0);
    ctx.lineTo(i * 100, 400);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 100);
    ctx.lineTo(400, i * 100);
    ctx.stroke();
  }
  ctx.fillStyle = '#000000';
  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillText(board[i][j].toUpperCase(), j * 100 + 50, i * 100 + 50);
    }
  }
  return canvas.toBuffer();
}

async function endGame(gameId, client, channel) {
  if (!games[gameId]) return;
  const p1Count = words[gameId].p1.length;
  const p2Count = words[gameId].p2.length;
  let winner = p1Count > p2Count ? 'Player 1 wins!' : p2Count > p1Count ? 'Player 2 wins!' : 'It\'s a tie!';
  const p1User = await client.users.fetch(games[gameId].player1);
  const p2User = await client.users.fetch(games[gameId].player2);
  const avatar1 = await Canvas.loadImage(p1User.displayAvatarURL({ format: 'png' }));
  const avatar2 = await Canvas.loadImage(p2User.displayAvatarURL({ format: 'png' }));
  const resultCanvas = Canvas.createCanvas(600, 300);
  const resultCtx = resultCanvas.getContext('2d');
  resultCtx.fillStyle = '#ffffff';
  resultCtx.fillRect(0, 0, 600, 300);
  resultCtx.drawImage(avatar1, 50, 100, 150, 150);
  resultCtx.drawImage(avatar2, 400, 100, 150, 150);
  resultCtx.fillStyle = '#000000';
  resultCtx.font = '20px sans-serif';
  resultCtx.textAlign = 'center';
  resultCtx.fillText(`${p1User.tag}`, 125, 60);
  resultCtx.fillText(`${p1Count} words`, 125, 80);
  resultCtx.fillText(`${p2User.tag}`, 475, 60);
  resultCtx.fillText(`${p2Count} words`, 475, 80);
  resultCtx.font = '30px sans-serif';
  resultCtx.fillText(winner, 300, 50);
  channel.send({ content: 'Boggle game over!', files: [{ attachment: resultCanvas.toBuffer(), name: 'boggle-result.png' }] });
  delete activeGames[games[gameId].player1];
  delete activeGames[games[gameId].player2];
  delete games[gameId];
  delete words[gameId];
  delete endTimes[gameId];
  delete boards[gameId];
  saveState();
}

// CAH helper functions
async function fetchCards() {
  const query = `
    query {
      packs {
        black {
          text
          pick
        }
        white {
          text
        }
      }
    }
  `;
  try {
    const res = await fetch('https://restagainsthumanity.com/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const { data } = await res.json();
    let blacks = [], whites = [];
    data.packs.forEach(p => {
      blacks.push(...p.black);
      whites.push(...p.white);
    });
    blacks.sort(() => Math.random() - 0.5);
    whites.sort(() => Math.random() - 0.5);
    return { blacks, whites };
  } catch (error) {
    console.error('Error fetching CAH cards:', error);
    return { blacks: [], whites: [] };
  }
}

async function sendHand(userId, hand) {
  const user = await client.users.fetch(userId);
  const handText = 'Your hand:\n' + hand.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
  user.send(handText);
}

async function startRound(gameId) {
  const game = cahGames[gameId];
  const channel = await client.channels.fetch(game.channel);
  const czarId = game.players[game.czarIndex];
  if (cahDecks[gameId].blacks.length === 0) {
    return endCahGame(gameId, 'No more black cards!');
  }
  const black = cahDecks[gameId].blacks.shift();
  cahCurrent[gameId] = {
    black,
    submissions: {},
    mapping: {},
    pickMap: {},
    showed: false,
    anonCount: 0
  };
  saveState();
  channel.send(`# Round Start!\nBlack card: \`${black.text}\` (Pick: ${black.pick})\nCard Czar: <@${czarId}>`);
  for (const playerId of game.players) {
    if (playerId === czarId) continue;
    const user = await client.users.fetch(playerId);
    user.send(`Submit ${black.pick} card number(s) separated by space (e.g., 1 3).`);
  }
}

async function showSubmissions(gameId) {
  const current = cahCurrent[gameId];
  if (current.showed) return;
  const game = cahGames[gameId];
  const channel = await client.channels.fetch(game.channel);
  const czarId = game.players[game.czarIndex];
  let anons = Object.keys(current.submissions);
  anons.sort(() => Math.random() - 0.5);
  let list = '**Submissions:**\n';
  const pickMap = {};
  anons.forEach((anon, i) => {
    const cards = current.submissions[anon];
    let displayText;
    if (current.black.pick === 0 || !current.black.text.includes('_')) {
      displayText = `${current.black.text} ${cards.join(', ')}`;
    } else {
      let filled = current.black.text;
      cards.forEach(c => {
        filled = filled.replace('_', c);
      });
      displayText = filled;
    }
    const num = i + 1;
    list += `${num}\) \`${displayText}\`\n`;
    pickMap[num] = anon;
  });
  current.pickMap = pickMap;
  current.showed = true;
  saveState();
  channel.send(`${list}\nCzar <@${czarId}>, choose winner with +pick <number>`);
}

async function endCahGame(gameId, reason) {
  const game = cahGames[gameId];
  const channel = await client.channels.fetch(game.channel);
  let scoresText = '**Final Scores:**\n';
  game.players.forEach((p, i) => {
    scoresText += `<@${p}>: ${game.scores[i]} points\n`;
  });
  channel.send(`Game over! ${reason}\n${scoresText}`);
  game.players.forEach(p => delete cahActivePlayers[p]);
  delete cahGames[gameId];
  delete cahHands[gameId];
  delete cahDecks[gameId];
  delete cahCurrent[gameId];
  saveState();
}

// Command handlers
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
- \`+boggle\` - play boggle
- \`+join\` - join boggle game
- \`+cah\` - start Cards Against Humanity game (requires 4 players)
- \`+joincah\` - join CAH game
- \`+pick <num>\` - (CAH Czar only) pick winning submission
*Note*: Permanent custom white cards for CAH can be added using node addWhite.js "card text".
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
  },

  boggle: async (message) => {
    console.log(`User ${message.author.tag} used +boggle in channel ${message.channel.id}`);
    if (games[message.channel.id]) {
      return message.channel.send('A game is already in progress in this channel!');
    }
    games[message.channel.id] = { player1: message.author.id, player2: null, channel: message.channel.id };
    activeGames[message.author.id] = message.channel.id;
    saveState();
    await message.channel.send('Boggle game started! Use +join to join as the second player.');
  },

  join: async (message) => {
    console.log(`User ${message.author.tag} used +join in channel ${message.channel.id}`);
    if (!games[message.channel.id]) {
      return message.channel.send('No Boggle game is currently active in this channel!');
    }
    if (games[message.channel.id].player2) {
      return message.channel.send('The game is already full!');
    }
    if (message.author.id === games[message.channel.id].player1) {
      return message.channel.send('You cannot join your own game!');
    }
    games[message.channel.id].player2 = message.author.id;
    activeGames[message.author.id] = message.channel.id;

    const dice = [
      "AACIOT", "ABILTY", "ABJMOQ", "ACDEMP",
      "ACELRS", "ADENVZ", "AHMORS", "BIFORX",
      "DENOSW", "DKNOTU", "EEFHIY", "EGKLUY",
      "EGINTV", "EHINPS", "ELPSTU", "GILRUW"
    ];

    dice.sort(() => Math.random() - 0.5);
    const board = [];
    for (let i = 0; i < 4; i++) {
      const row = [];
      for (let j = 0; j < 4; j++) {
        const die = dice[i * 4 + j];
        const letter = die[Math.floor(Math.random() * 6)];
        row.push(letter);
      }
      board.push(row);
    }

    boards[message.channel.id] = board;
    words[message.channel.id] = { p1: [], p2: [] };
    endTimes[message.channel.id] = Date.now() + 120000;
    saveState();
    const boardBuffer = await createBoardImage(board);
    const boardMessage = 'Boggle board:\n\nSend words (one per message) via DM to me. Words must be formable from adjacent letters (horizontal, vertical, diagonal), no reusing letters in one word, at least 3 letters long.';
    const timestamp = Math.floor(Date.now() / 1000) + 120;
    const countdownMessage = `Time left: <t:${timestamp}:R>`;
    const sendToPlayer = (userId) => {
      client.users.fetch(userId).then(u => {
        u.send({ content: boardMessage, files: [{ attachment: boardBuffer, name: 'boggle-board.png' }] });
        u.send(countdownMessage);
      }).catch(console.error);
    };
    sendToPlayer(games[message.channel.id].player1);
    sendToPlayer(games[message.channel.id].player2);
    setTimeout(() => endGame(message.channel.id, client, message.channel), 120000);
  },

  cah: async (message) => {
    const gameId = message.channel.id;
    if (cahGames[gameId]) {
      return message.channel.send('A CAH game is already in progress in this channel!');
    }
    cahGames[gameId] = {
      players: [message.author.id],
      czarIndex: 0,
      scores: [],
      channel: gameId
    };
    cahActivePlayers[message.author.id] = gameId;
    cahDecks[gameId] = { blacks: [], whites: [] };
    saveState();
    await message.channel.send('CAH game started! Need 4 players. Use +joincah to join.');
  },

  joincah: async (message) => {
    const gameId = message.channel.id;
    if (!cahGames[gameId]) {
      return message.channel.send('No CAH game is currently active in this channel!');
    }
    const game = cahGames[gameId];
    if (game.players.length >= 4) {
      return message.channel.send('The game is already full!');
    }
    if (game.players.includes(message.author.id)) {
      return message.channel.send('You are already in the game!');
    }
    game.players.push(message.author.id);
    cahActivePlayers[message.author.id] = gameId;
    saveState();
    await message.channel.send(`Player <@${message.author.id}> joined! (${game.players.length}/4)`);
    if (game.players.length === 4) {
      game.scores = new Array(4).fill(0);
      const fetchedCards = await fetchCards();
      cahDecks[gameId].blacks = fetchedCards.blacks;
      cahDecks[gameId].whites = [...customWhiteCards, ...fetchedCards.whites];
      cahDecks[gameId].whites.sort(() => Math.random() - 0.5);
      cahHands[gameId] = {};
      for (let i = 0; i < 4; i++) {
        const playerId = game.players[i];
        const hand = cahDecks[gameId].whites.splice(0, 10);
        cahHands[gameId][playerId] = hand;
        await sendHand(playerId, hand);
      }
      saveState();
      await message.channel.send('All players joined! Starting game.');
      await startRound(gameId);
    }
  },

  pick: async (message, args) => {
    const gameId = message.channel.id;
    if (!cahGames[gameId] || !cahCurrent[gameId]) {
      return;
    }
    const game = cahGames[gameId];
    const current = cahCurrent[gameId];
    const czarId = game.players[game.czarIndex];
    if (message.author.id !== czarId) {
      return message.reply('Only the Card Czar can pick the winner!');
    }
    if (!current.showed) {
      return message.reply('Submissions are not ready yet!');
    }
    const num = parseInt(args[0]);
    if (isNaN(num) || !current.pickMap[num]) {
      return message.reply('Invalid pick number!');
    }
    const anon = current.pickMap[num];
    const winnerId = current.mapping[anon];
    const winnerIndex = game.players.indexOf(winnerId);
    game.scores[winnerIndex]++;
    saveState();
    const filled = current.black.text.replace(/_/g, (match, offset) => current.submissions[anon].shift() || match);
    await message.channel.send(`Winner is <@${winnerId}> with: \`${filled}\`\nThey get 1 awesome point! Current score: ${game.scores[winnerIndex]}`);
    if (game.scores[winnerIndex] >= 5) {
      return endCahGame(gameId, `<@${winnerId}> reached 5 points!`);
    }
    for (const playerId of game.players) {
      const hand = cahHands[gameId][playerId];
      const needed = 10 - hand.length;
      if (needed > 0) {
        hand.push(...cahDecks[gameId].whites.splice(0, needed));
      }
      await sendHand(playerId, hand);
    }
    game.czarIndex = (game.czarIndex + 1) % 4;
    saveState();
    await startRound(gameId);
  }
};

// Unified message handler
client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  if (message.channel.type === 'DM') {
    const boggleGameId = activeGames[message.author.id];
    if (boggleGameId && games[boggleGameId] && Date.now() < endTimes[boggleGameId] &&
        (message.author.id === games[boggleGameId].player1 || message.author.id === games[boggleGameId].player2)) {
      const player = message.author.id === games[boggleGameId].player1 ? 'p1' : 'p2';
      const word = message.content.trim().toLowerCase();
      const board = boards[boggleGameId];
      if (isValidWord(board, word) && !words[boggleGameId][player].includes(word)) {
        const isValid = await isValidEnglishWord(word);
        if (isValid) {
          words[boggleGameId][player].push(word);
          await message.reply(`Valid word added: ${word}`);
          console.log(`Player ${message.author.tag} submitted valid word: ${word} in game ${boggleGameId}`);
        } else {
          await message.reply(`Invalid word: ${word} is not a recognized English word`);
        }
      } else {
        await message.reply(`Invalid word: ${word} (either not formable, too short, or duplicate)`);
      }
      saveState();
      return;
    }

    const cahGameId = cahActivePlayers[message.author.id];
    if (cahGameId && cahCurrent[cahGameId]) {
      const game = cahGames[cahGameId];
      const current = cahCurrent[cahGameId];
      const czarId = game.players[game.czarIndex];
      if (message.author.id === czarId) {
        return message.reply('Card Czar does not submit cards!');
      }
      if (Object.values(current.mapping).includes(message.author.id)) {
        return message.reply('You have already submitted!');
      }
      const nums = message.content.trim().split(' ').map(n => parseInt(n) - 1);
      if (nums.length !== current.black.pick || nums.some(isNaN) || new Set(nums).size !== nums.length) {
        return message.reply(`Invalid submission! Need exactly ${current.black.pick} unique card numbers.`);
      }
      const hand = cahHands[cahGameId][message.author.id];
      if (nums.some(i => i < 0 || i >= hand.length)) {
        return message.reply('Invalid card numbers!');
      }
      const cards = nums.map(i => hand[i].text);
      nums.sort((a, b) => b - a);
      nums.forEach(i => hand.splice(i, 1));
      const anon = `anon${++current.anonCount}`;
      current.submissions[anon] = cards;
      current.mapping[anon] = message.author.id;
      saveState();
      await message.reply('Submission received!');
      if (Object.keys(current.submissions).length === game.players.length - 1) {
        await showSubmissions(cahGameId);
      }
      return;
    }
  }

  if (!message.content.startsWith('+')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (commands[command]) {
    await commands[command](message, args);
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  rotateStatus();
  setInterval(rotateStatus, 300000);
});

client.login(TOKEN);
