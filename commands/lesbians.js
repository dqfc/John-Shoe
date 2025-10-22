module.exports = async (message, args, context) => {
  if (args.length === 0) {
    await message.channel.send('Please mention a user, e.g., +lesbians @person');
    return;
  }
  const mention = args[0];
  if (!mention.match(/^<@!?[0-9]+>$/)) {
    await message.channel.send('Please provide a valid user mention, e.g., +lesbians @person');
    return;
  }
  const randomNumber = Math.floor(Math.random() * 100) + 1;
  await message.channel.send(`${mention} is **${randomNumber}%** lesbians`);
  console.log(`User ${message.author.tag} used +lesbians with mention ${mention}`);
};
