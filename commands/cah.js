module.exports = async (message, args, context) => {
  const { cahGames, cahActivePlayers, cahDecks, saveState } = context;
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
  await saveState();
  await message.channel.send('CAH game started! Need 4 players. Use +joincah to join.');
};
