module.exports = async (message, args, context) => {
  const helpText = `
**Available Commands:**
- \`+hello\` - hello world
- \`+ping\` - pong
- \`+help\` - shows this help message
- \`+fox\` - get picture of fox
- \`+cat\` - get picture of cat
- \`+dog\` - get picture of dog
- \`+gif\` - send random gif
- \`+gay <@user>\` - find how much of a gay someone is
- \`+lesbian <@user>\` - find how much of a lesbian someone is
- \`+burn <text>\` - burning text
- \`+quote\` - quote a message (reply to someone)
- \`+boggle\` - play boggle
- \`+battleship\` - play battleship
- \`+join\` - join boggle or battleship game
- \`+cah\` - start Cards Against Humanity game (requires 4 players)
- \`+joincah\` - join CAH game
- \`+pick <num>\` - (CAH Czar only) pick winning submission
  `;
  await message.channel.send(helpText);
};
