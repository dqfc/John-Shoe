module.exports = async (message, args, context) => {
  const { games, activeGames, saveState } = context;
  console.log(`User ${message.author.tag} used +boggle in channel ${message.channel.id}`);
  const gameId = message.channel.id;
  if (games[gameId]) {
    return message.channel.send('A game is already in progress in this channel!');
  }
  games[gameId] = { player1: message.author.id, player2: null, channel: message.channel.id, gameType: 'boggle' };
  activeGames[message.author.id] = gameId;
  await saveState();
  await message.channel.send('Boggle game started! Use +join to join as the second player.');
};
