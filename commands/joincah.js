module.exports = async (message, args, context) => {
  const { cahGames, cahActivePlayers, cahDecks, cahHands, customWhiteCards, fetchCards, sendHand, startRound, saveState } = context;
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
  await saveState();
  await message.channel.send(`Player <@${message.author.id}> joined! (${game.players.length}/4)`);
  if (game.players.length === 4) {
    game.scores = new Array(4).fill(0);
    let whiteDeck = [...customWhiteCards];
    if (context.FORCE_CUSTOM_CARDS_ONLY) {
      if (whiteDeck.length < 40) {
        await message.channel.send('Error: Not enough custom white cards (need at least 40 for 4 players). Add more using node addWhite.js or set FORCE_CUSTOM_CARDS_ONLY to false.');
        game.players.forEach(p => delete cahActivePlayers[p]);
        delete cahGames[gameId];
        delete cahDecks[gameId];
        await saveState();
        return;
      }
      const fetched = await fetchCards();
      cahDecks[gameId].blacks = fetched.blacks;
    } else {
      const fetchedCards = await fetchCards();
      cahDecks[gameId].blacks = fetchedCards.blacks;
      whiteDeck = [...whiteDeck, ...fetchedCards.whites];
    }
    whiteDeck.sort(() => Math.random() - 0.5);
    cahDecks[gameId].whites = whiteDeck;
    cahHands[gameId] = {};
    for (let i = 0; i < 4; i++) {
      const playerId = game.players[i];
      const hand = cahDecks[gameId].whites.splice(0, 10);
      cahHands[gameId][playerId] = hand;
      await sendHand(playerId, hand);
    }
    await saveState();
    await message.channel.send('All players joined! Starting game.');
    await startRound(gameId);
  }
};
