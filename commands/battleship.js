module.exports = async (message, args, context) => {
  const { games, activeGames, battleshipBoards, placementPhases, placedShips, saveState } = context;
  console.log(`User ${message.author.tag} used +battleship in channel ${message.channel.id}`);
  const gameId = message.channel.id;
  if (games[gameId]) {
    return message.channel.send('A game is already in progress in this channel!');
  }
  games[gameId] = { player1: message.author.id, player2: null, channel: message.channel.id, gameType: 'battleship' };
  activeGames[message.author.id] = gameId;
  battleshipBoards[gameId] = {
    p1Own: Array(10).fill().map(() => Array(10).fill(' ')),
    p1Tracking: Array(10).fill().map(() => Array(10).fill(' ')),
    p2Own: Array(10).fill().map(() => Array(10).fill(' ')),
    p2Tracking: Array(10).fill().map(() => Array(10).fill(' '))
  };
  placementPhases[gameId] = { p1: false, p2: false };
  placedShips[gameId] = { p1: [], p2: [] };
  await saveState();
  await message.channel.send('Battleship game started! Use +join to join as the second player.');
};
