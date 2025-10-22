const fs = require('fs');
if (process.argv.length < 3) {
  console.error('Usage: node addWhite.js "card text"');
  process.exit(1);
}

const cardText = process.argv.slice(2).join(' ').trim();
if (!cardText) {
  console.error('Error: Card text cannot be empty');
  process.exit(1);
}
if (cardText.length > 100) {
  console.error('Error: Card text must be 100 characters or less');
  process.exit(1);
}

let customWhiteCards = [];
try {
  customWhiteCards = JSON.parse(fs.readFileSync('./json/customWhiteCards.json', 'utf8')) || [];
} catch (e) {
  console.error('Error: Failed to read customWhiteCards.json:', e.message);
  process.exit(1);
}

// Add custom white card
customWhiteCards.push({ text: cardText });

// Save updated customWhiteCards.json
try {
  fs.writeFileSync('./json/customWhiteCards.json', JSON.stringify(customWhiteCards));
  console.log(`Successfully added permanent white card: "${cardText}"`);
  process.exit(0);
} catch (e) {
  console.error('Error: Failed to write customWhiteCards.json:', e.message);
  process.exit(1);
}
