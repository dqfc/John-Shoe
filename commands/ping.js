module.exports = async (message, args, context) => {
  console.log(`User ${message.author.tag} used +ping`);
  await message.channel.send('pong');
};
