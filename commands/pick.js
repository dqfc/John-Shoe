module.exports = async (message, args, context) => {
  const { cahGames, cahCurrent, saveState, endCahGame, sendHand, startRound } = context;
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
  await saveState();
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
  await saveState();
  await startRound(gameId);
};
