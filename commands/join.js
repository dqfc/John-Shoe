module.exports = async (message, args, context) => {
  const { client, games, activeGames, boards, words, endTimes, battleshipBoards, boardMessages, saveState, createBoardImage, createBattleshipImage, updateBoards } = context;
  console.log(`User ${message.author.tag} used +join in channel ${message.channel.id}`);
  const gameId = message.channel.id;
  if (!games[gameId]) {
    return message.channel.send('No game is currently active in this channel!');
  }
  if (games[gameId].player2) {
    return message.channel.send('The game is already full!');
  }
  if (message.author.id === games[gameId].player1) {
    return message.channel.send('You cannot join your own game!');
  }
  games[gameId].player2 = message.author.id;
  activeGames[message.author.id] = gameId;
  await saveState();
  if (games[gameId].gameType === 'boggle') {
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
    boards[gameId] = board;
    words[gameId] = { p1: [], p2: [] };
    endTimes[gameId] = Date.now() + 120000;
    await saveState();
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
    sendToPlayer(games[gameId].player1);
    sendToPlayer(games[gameId].player2);
    setTimeout(() => context.endGame(gameId, client, message.channel), 120000);
  } else if (games[gameId].gameType === 'battleship') {
    await message.channel.send('Second player joined! Place your ships via DM.');
    const sendInstructions = async (userId, playerKey) => {
      const user = await client.users.fetch(userId);
      user.send('Place your ships: carrier (5), battleship (4), cruiser (3), submarine (3), destroyer (2)');
      user.send('Command: <ship> <coord> <dir> e.g. carrier A1 h');
      user.send('Coords A1-J10, dir h horizontal, v vertical');
      const ownKey = `${playerKey}Own`;
      const ownGrid = battleshipBoards[gameId][ownKey];
      const trackingGrid = battleshipBoards[gameId][`${playerKey}Tracking`];
      const img = await createBattleshipImage(ownGrid, trackingGrid);
      const message = await user.send({ content: 'Your current boards:', files: [{ attachment: img, name: 'boards.png' }] });
      boardMessages[gameId] = boardMessages[gameId] || {};
      boardMessages[gameId][playerKey] = message.id;
      await saveState();
    };
    await sendInstructions(games[gameId].player1, 'p1');
    await sendInstructions(games[gameId].player2, 'p2');
  }
};
