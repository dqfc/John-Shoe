const { Client, MessageAttachment } = require('discord.js-selfbot-v13');
const Canvas = require('canvas');
const fs = require('fs'); // Import full fs module for synchronous methods
const fsPromises = require('fs').promises; // Import fs.promises for async methods
const path = require('path');
require('dotenv').config();
const https = require('https');

const client = new Client({
  checkUpdate: false
});

const FORCE_CUSTOM_CARDS_ONLY = true;
const TOKEN = process.env.TOKEN;

const statuses = [
  { name: 'add something here', type: 'PLAYING' },
  { name: 'add something else here', type: 'LISTENING' },
  { name: 'and now for something completely different', type: 'WATCHING' }
];

let games = {}, words = {}, endTimes = {}, boards = {}, activeGames = {};
let cahGames = {}, cahHands = {}, cahDecks = {}, cahCurrent = {}, cahActivePlayers = {}, customWhiteCards = [];
let battleshipBoards = {}, currentTurns = {}, placedShips = {}, placementPhases = {}, boardMessages = {};
const shipSizes = { carrier: 5, battleship: 4, cruiser: 3, submarine: 3, destroyer: 2 };

// JSON utility functions
const { loadJson, saveJson } = require('./utils/jsonUtils');

async function loadState() {
  try {
    games = await loadJson('games.json') || {};
    words = await loadJson('words.json') || {};
    endTimes = await loadJson('endTimes.json') || {};
    boards = await loadJson('boards.json') || {};
    activeGames = await loadJson('activeGames.json') || {};
    cahGames = await loadJson('cahGames.json') || {};
    cahHands = await loadJson('cahHands.json') || {};
    cahDecks = await loadJson('cahDecks.json') || {};
    cahCurrent = await loadJson('cahCurrent.json') || {};
    cahActivePlayers = await loadJson('cahActivePlayers.json') || {};
    const rawCustomCards = await loadJson('customWhiteCards.json');
    customWhiteCards = Array.isArray(rawCustomCards) ? rawCustomCards : [];
    if (!Array.isArray(rawCustomCards)) {
      console.warn('Warning: customWhiteCards.json is not an array. Resetting to empty array.');
      await saveJson('customWhiteCards.json', []);
    }
    battleshipBoards = await loadJson('battleshipBoards.json') || {};
    currentTurns = await loadJson('currentTurns.json') || {};
    placedShips = await loadJson('placedShips.json') || {};
    placementPhases = await loadJson('placementPhases.json') || {};
    boardMessages = await loadJson('boardMessages.json') || {};
  } catch (e) {
    console.error('Failed to load state files:', e.message);
    const files = ['games.json', 'words.json', 'endTimes.json', 'boards.json', 'activeGames.json', 'cahGames.json', 'cahHands.json', 'cahDecks.json', 'cahCurrent.json', 'cahActivePlayers.json', 'customWhiteCards.json', 'battleshipBoards.json', 'currentTurns.json', 'placedShips.json', 'placementPhases.json', 'boardMessages.json'];
    for (const file of files) {
      await saveJson(file, file === 'customWhiteCards.json' ? [] : {});
    }
    customWhiteCards = [];
  }
}

async function saveState() {
  await saveJson('games.json', games);
  await saveJson('words.json', words);
  await saveJson('endTimes.json', endTimes);
  await saveJson('boards.json', boards);
  await saveJson('activeGames.json', activeGames);
  await saveJson('cahGames.json', cahGames);
  await saveJson('cahHands.json', cahHands);
  await saveJson('cahDecks.json', cahDecks);
  await saveJson('cahCurrent.json', cahCurrent);
  await saveJson('cahActivePlayers.json', cahActivePlayers);
  await saveJson('customWhiteCards.json', customWhiteCards);
  await saveJson('battleshipBoards.json', battleshipBoards);
  await saveJson('currentTurns.json', currentTurns);
  await saveJson('placedShips.json', placedShips);
  await saveJson('placementPhases.json', placementPhases);
  await saveJson('boardMessages.json', boardMessages);
}

// Load commands dynamically
const commands = {};
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  const commandName = file.split('.')[0].toLowerCase();
  commands[commandName] = command;
}

function rotateStatus() {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  client.user.setPresence({
    activities: [{ name: status.name, type: status.type }],
    status: 'online'
  });
  console.log(`Updated status to: ${status.type} ${status.name}`);
}

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
      if (!entry.word || typeof entry.defs !== 'object' || !Array.isArray(entry.defs)) {
        console.log(`Invalid entry for "${word}":`, entry);
        return entry.word.toLowerCase() === word.toLowerCase();
      }
      return entry.word.toLowerCase() === word.toLowerCase() && entry.defs.some(def => def.startsWith('n'));
    });
  } catch (error) {
    console.error(`Error validating word "${word}" with Datamuse:`, error.message);
    return false;
  }
}

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

async function createBattleshipImage(ownGrid, trackingGrid) {
  const cellSize = 40;
  const canvas = Canvas.createCanvas(900, 450);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText('Your Board', 250, 20);
  for (let i = 0; i < 10; i++) {
    ctx.fillText(String.fromCharCode(65 + i), 50 + i * cellSize + cellSize / 2, 70);
    ctx.fillText((i + 1).toString(), 25, 90 + i * cellSize + cellSize / 2);
  }
  ctx.fillText('Target Board', 650, 20);
  for (let i = 0; i < 10; i++) {
    ctx.fillText(String.fromCharCode(65 + i), 450 + i * cellSize + cellSize / 2, 70);
    ctx.fillText((i + 1).toString(), 425, 90 + i * cellSize + cellSize / 2);
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(50 + i * cellSize, 90);
    ctx.lineTo(50 + i * cellSize, 90 + 10 * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 90 + i * cellSize);
    ctx.lineTo(50 + 10 * cellSize, 90 + i * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(450 + i * cellSize, 90);
    ctx.lineTo(450 + i * cellSize, 90 + 10 * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(450, 90 + i * cellSize);
    ctx.lineTo(450 + 10 * cellSize, 90 + i * cellSize);
    ctx.stroke();
  }

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const x = 50 + c * cellSize;
      const y = 90 + r * cellSize;
      const cell = ownGrid[r][c];
      ctx.fillStyle = cell === ' ' ? '#add8e6' : cell === 'S' ? '#808080' : cell === 'H' ? '#ff0000' : '#ffffff';
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      if (cell === 'M') {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (cell === 'H') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cellSize - 5, y + 5);
        ctx.lineTo(x + 5, y + cellSize - 5);
        ctx.stroke();
      }
    }
  }

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const x = 450 + c * cellSize;
      const y = 90 + r * cellSize;
      const cell = trackingGrid[r][c];
      ctx.fillStyle = cell === ' ' ? '#add8e6' : cell === 'H' ? '#ff0000' : '#ffffff';
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      if (cell === 'M') {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (cell === 'H') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cellSize - 5, y + 5);
        ctx.lineTo(x + 5, y + cellSize - 5);
        ctx.stroke();
      }
    }
  }
  return canvas.toBuffer();
}

async function updateBoards(gameId, playerKey) {
  const playerId = games[gameId][playerKey === 'p1' ? 'player1' : 'player2'];
  const user = await client.users.fetch(playerId);
  const ownKey = `${playerKey}Own`;
  const trackingKey = `${playerKey}Tracking`;
  const ownGrid = battleshipBoards[gameId][ownKey];
  const trackingGrid = battleshipBoards[gameId][trackingKey];
  const img = await createBattleshipImage(ownGrid, trackingGrid);
  const content = playerKey === currentTurns[gameId] ? 'Your turn!' : 'Waiting for opponent...';
  if (!boardMessages[gameId] || !boardMessages[gameId][playerKey]) {
    const message = await user.send({ content, files: [{ attachment: img, name: 'boards.png' }] });
    boardMessages[gameId] = boardMessages[gameId] || {};
    boardMessages[gameId][playerKey] = message.id;
    await saveState();
  } else {
    const messageId = boardMessages[gameId][playerKey];
    try {
      const message = await user.dmChannel.messages.fetch(messageId);
      await message.edit({ content, files: [{ attachment: img, name: 'boards.png' }] });
    } catch (error) {
      console.error(`Failed to edit message for ${playerKey}:`, error);
      const message = await user.send({ content, files: [{ attachment: img, name: 'boards.png' }] });
      boardMessages[gameId][playerKey] = message.id;
      await saveState();
    }
  }
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
  await saveState();
}

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
  await saveState();
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
      displayText = `${current.black.text} + ${cards.join(', ')}`;
    } else {
      let filled = current.black.text;
      cards.forEach(c => {
        filled = filled.replace('_', c);
      });
      displayText = filled;
    }
    const num = i + 1;
    list += `${num}. \`${displayText}\`\n`;
    pickMap[num] = anon;
  });
  current.pickMap = pickMap;
  current.showed = true;
  await saveState();
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
  await saveState();
}

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  if (message.channel.type === 'DM') {
    const cahGameId = cahActivePlayers[message.author.id];
    if (cahGameId && cahCurrent[cahGameId]) {
      const game = cahGames[cahGameId];
      const current = cahCurrent[cahGameId];
      const czarId = game.players[game.czarIndex];
      if (message.author.id === czarId) {
        const errorMsg = await message.reply('Card Czar does not submit cards!');
        await message.react('❌');
        setTimeout(() => errorMsg.delete().catch(console.error), 5000);
        return;
      }
      if (Object.values(current.mapping).includes(message.author.id)) {
        const errorMsg = await message.reply('You have already submitted!');
        await message.react('❌');
        setTimeout(() => errorMsg.delete().catch(console.error), 5000);
        return;
      }
      const nums = message.content.trim().split(' ').map(n => parseInt(n) - 1);
      if (nums.length !== current.black.pick || nums.some(isNaN) || new Set(nums).size !== nums.length) {
        const errorMsg = await message.reply(`Invalid submission! Need exactly ${current.black.pick} unique card numbers.`);
        await message.react('❌');
        setTimeout(() => errorMsg.delete().catch(console.error), 5000);
        return;
      }
      const hand = cahHands[cahGameId][message.author.id];
      if (nums.some(i => i < 0 || i >= hand.length)) {
        const errorMsg = await message.reply('Invalid card numbers!');
        await message.react('❌');
        setTimeout(() => errorMsg.delete().catch(console.error), 5000);
        return;
      }
      const cards = nums.map(i => hand[i].text);
      nums.sort((a, b) => b - a);
      nums.forEach(i => hand.splice(i, 1));
      const anon = `anon${++current.anonCount}`;
      current.submissions[anon] = cards;
      current.mapping[anon] = message.author.id;
      await saveState();
      await message.react('✅');
      await message.reply('Submission received!');
      if (Object.keys(current.submissions).length === game.players.length - 1) {
        await showSubmissions(cahGameId);
      }
      return;
    }

    const gameId = activeGames[message.author.id];
    if (gameId && games[gameId]) {
      if (games[gameId].gameType === 'boggle') {
        if (Date.now() < endTimes[gameId] &&
          (message.author.id === games[gameId].player1 || message.author.id === games[gameId].player2)) {
          const player = message.author.id === games[gameId].player1 ? 'p1' : 'p2';
          const word = message.content.trim().toLowerCase();
          const board = boards[gameId];
          if (isValidWord(board, word) && !words[gameId][player].includes(word)) {
            const isValid = await isValidEnglishWord(word);
            if (isValid) {
              words[gameId][player].push(word);
              await message.react('✅');
              await message.reply(`Valid word added: ${word}`);
              console.log(`Player ${message.author.tag} submitted valid word: ${word} in game ${gameId}`);
            } else {
              const errorMsg = await message.reply(`Invalid word: ${word} is not a recognized English word`);
              await message.react('❌');
              setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            }
          } else {
            const errorMsg = await message.reply(`Invalid word: ${word} (either not formable, too short, or duplicate)`);
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
          }
          await saveState();
          return;
        }
      } else if (games[gameId].gameType === 'battleship') {
        const playerKey = message.author.id === games[gameId].player1 ? 'p1' : 'p2';
        const oppKey = playerKey === 'p1' ? 'p2' : 'p1';
        if (!placementPhases[gameId][playerKey]) {
          const parts = message.content.trim().toLowerCase().split(' ');
          if (parts.length !== 3) {
            const errorMsg = await message.reply('Invalid format. Use: <ship> <coord> <dir> e.g. carrier A1 h');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const ship = parts[0];
          let coord = parts[1].toUpperCase();
          const dir = parts[2];
          if (!shipSizes[ship]) {
            const errorMsg = await message.reply('Invalid ship. Valid: carrier, battleship, cruiser, submarine, destroyer');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          if (placedShips[gameId][playerKey].includes(ship)) {
            const errorMsg = await message.reply('Ship already placed.');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          if (!/^[A-J]([1-9]|10)$/.test(coord)) {
            const errorMsg = await message.reply('Invalid coord e.g. A1 or J10');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const col = coord.charCodeAt(0) - 65;
          const row = parseInt(coord.slice(1)) - 1;
          const size = shipSizes[ship];
          let positions = [];
          if (dir === 'h') {
            if (col + size > 10) {
              const errorMsg = await message.reply('Out of bounds.');
              await message.react('❌');
              setTimeout(() => errorMsg.delete().catch(console.error), 5000);
              return;
            }
            for (let i = 0; i < size; i++) {
              positions.push([row, col + i]);
            }
          } else if (dir === 'v') {
            if (row + size > 10) {
              const errorMsg = await message.reply('Out of bounds.');
              await message.react('❌');
              setTimeout(() => errorMsg.delete().catch(console.error), 5000);
              return;
            }
            for (let i = 0; i < size; i++) {
              positions.push([row + i, col]);
            }
          } else {
            const errorMsg = await message.reply('Direction must be h or v.');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const ownGrid = battleshipBoards[gameId][`${playerKey}Own`];
          for (let [r, c] of positions) {
            if (ownGrid[r][c] !== ' ') {
              const errorMsg = await message.reply('Overlap or occupied.');
              await message.react('❌');
              setTimeout(() => errorMsg.delete().catch(console.error), 5000);
              return;
            }
          }
          for (let [r, c] of positions) {
            ownGrid[r][c] = 'S';
          }
          placedShips[gameId][playerKey].push(ship);
          await saveState();
          await message.react('✅');
          await message.reply(`Placed ${ship} at ${coord} ${dir.toUpperCase()}`);
          await updateBoards(gameId, playerKey);
          if (placedShips[gameId][playerKey].length === 5) {
            placementPhases[gameId][playerKey] = true;
            await saveState();
            await message.reply('All ships placed! Waiting for opponent.');
            if (placementPhases[gameId].p1 && placementPhases[gameId].p2) {
              currentTurns[gameId] = 'p1';
              await saveState();
              const channel = await client.channels.fetch(gameId);
              channel.send('Both players have placed their ships! Game starts. Player 1\'s turn.');
              await updateBoards(gameId, 'p1');
              await updateBoards(gameId, 'p2');
            }
          }
        } else {
          if (currentTurns[gameId] !== playerKey) {
            const errorMsg = await message.reply('Not your turn!');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const coord = message.content.trim().toUpperCase();
          if (!/^[A-J]([1-9]|10)$/.test(coord)) {
            const errorMsg = await message.reply('Invalid coord e.g. A1 or J10');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const col = coord.charCodeAt(0) - 65;
          const row = parseInt(coord.slice(1)) - 1;
          const trackingGrid = battleshipBoards[gameId][`${playerKey}Tracking`];
          if (trackingGrid[row][col] !== ' ') {
            const errorMsg = await message.reply('Already guessed there.');
            await message.react('❌');
            setTimeout(() => errorMsg.delete().catch(console.error), 5000);
            return;
          }
          const oppOwnGrid = battleshipBoards[gameId][`${oppKey}Own`];
          const isHit = oppOwnGrid[row][col] === 'S';
          const mark = isHit ? 'H' : 'M';
          oppOwnGrid[row][col] = mark;
          trackingGrid[row][col] = mark;
          await saveState();
          await message.react('✅');
          const channel = await client.channels.fetch(gameId);
          channel.send(`<@${message.author.id}> guessed ${coord}: ${isHit ? 'Hit!' : 'Miss!'}`);
          const oppHits = oppOwnGrid.flat().filter(cell => cell === 'H').length;
          if (oppHits === 17) {
            channel.send(`<@${message.author.id}> wins! All opponent's ships sunk.`);
            delete activeGames[games[gameId].player1];
            delete activeGames[games[gameId].player2];
            delete games[gameId];
            delete battleshipBoards[gameId];
            delete currentTurns[gameId];
            delete placedShips[gameId];
            delete placementPhases[gameId];
            delete boardMessages[gameId];
            await saveState();
            return;
          }
          currentTurns[gameId] = oppKey;
          await saveState();
          await updateBoards(gameId, 'p1');
          await updateBoards(gameId, 'p2');
          await message.reply(`${isHit ? 'Hit' : 'Miss'} on ${coord}`);
        }
        return;
      }
    }
  }

  if (!message.content.startsWith('+')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (commands[command]) {
    await commands[command](message, args, {
      client,
      games,
      words,
      endTimes,
      boards,
      activeGames,
      cahGames,
      cahHands,
      cahDecks,
      cahCurrent,
      cahActivePlayers,
      customWhiteCards,
      battleshipBoards,
      currentTurns,
      placedShips,
      placementPhases,
      boardMessages,
      shipSizes,
      saveState,
      createBoardImage,
      createBattleshipImage,
      updateBoards,
      endGame,
      fetchCards,
      sendHand,
      startRound,
      showSubmissions,
      endCahGame
    });
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  loadState().then(() => {
    rotateStatus();
    setInterval(rotateStatus, 300000);
  });
});

client.login(TOKEN);
