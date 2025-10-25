const fs = require('fs').promises;
const path = require('path');

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
      const filePath = path.join(__dirname, '..', 'json', file);
      await fs.writeFile(filePath, '{}', 'utf8');
      console.log(`Successfully reset ${filePath} to {}`);
    }
  } catch (error) {
    console.error('Error resetting JSON files:', error);
  }
}

resetJsonFiles();
