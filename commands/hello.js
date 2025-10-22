module.exports = async (message, args, context) => {
  await message.channel.send('hi');
  console.log(`User ${message.author.tag} used +hello`);
};
