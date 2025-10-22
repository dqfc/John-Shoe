const fs = require('fs').promises;

async function resetJsonFiles() {
  const files = [
    'activeGames.json',
    'boards.json',
    'endTimes.json',
    'games.json',
    'words.json',
    'cahGames.json',
    'cahHands.json',
    'cahDecks.json',
    'cahCurrent.json',
    'cahActivePlayers.json',
    'battleshipBoards.json',
    'placedShips.json',
    'placementPhases.json',
    'boardMessages.json'
  ];

  try {
    for (const file of files) {
      await fs.writeFile(file, '{}', 'utf8');
      console.log(`Successfully reset ${file} to {}`);
    }
  } catch (error) {
    console.error('Error resetting JSON files:', error);
  }
}

resetJsonFiles();
