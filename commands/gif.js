module.exports = async (message, args, context) => {
  const responses = [
    'https://tenor.com/view/df-hh-gif-26247943',
    'https://tenor.com/view/mr-utah-dance-gif-11499022268151868481',
    'https://cdn.discordapp.com/attachments/1295104679918829639/1390878729458290750/twitter_1940972343406600328.gif?ex=68f8e702&is=68f79582&hm=986417ca523ab939850a3d82249ffb5fa6e14f37a1f2ca4e007d6e1b67e2c16e&',
    'https://tenor.com/view/kurt-cobain-nirvana-grunge-kurt-cobain-gif-26486856',
    'https://tenor.com/view/cat-cat-looking-around-looking-around-orange-cat-doom-1993-gif-1032019449693505825',
    'https://tenor.com/view/keemxdaxtruth-lmao-dead-nope-gif-14774804',
    'https://tenor.com/view/bro-just-typing-shit-atm-man-funny-tiktok-gif-6754206601808444804',
    'https://tenor.com/view/cat-gif-22201828',
    'https://cdn.discordapp.com/attachments/1356028858758987929/1395288902780059680/Tumblr_l_2976258243386051.gif?ex=68f288cd&is=68f1374d&hm=480fdeec339dade188e0ab6b1359b7fcad9edf73ff52cac9c75fa1c07e7697d5&',
    'https://tenor.com/view/we-got-this-we-can-do-it-lets-do-this-its-go-time-gif-18162766352197200050',
    'https://cdn.discordapp.com/attachments/1236480298225500270/1312810679257796648/9F6DF7B0-AE36-495E-84F6-3BCB85D43273.gif?ex=68f26838&is=68f116b8&hm=b0bbe8d8ed8590a5120d6f072c973c5253dafcbb6d73c4fe86bd4a5840c5d17f&',
    'https://tenor.com/view/bedankt-stemmen-d66-gif-20750336',
    'https://tenor.com/view/blue-protocol-discord-everyday-xp-rank-2-gif-15559150468971950141',
    'https://tenor.com/view/basketball-miss-failure-fail-gif-24912602',
    'https://cdn.discordapp.com/attachments/1324276331026055273/1397803254062120970/attachment.gif?ex=68f273f9&is=68f12279&hm=2d94d68e15c413a76c6ffec49a7ff3c977143a7a141937fbda7972c1a1042572&',
    'https://cdn.discordapp.com/attachments/1018055445279154218/1402821050319769651/image0.gif?ex=68f2e8e9&is=68f19769&hm=2e96ad6024a20e7f6a91713cb9e409bbe2646dcf00a671ae318802da18f2a0f7&',
    'https://cdn.discordapp.com/attachments/1324276331026055273/1382596101038801036/twitter_1932477189649297556.gif?ex=68f28035&is=68f12eb5&hm=556efb2430856c411bbb1f01068205d6c1793894177703ccddf9e13c7a4c81e1&',
    'https://cdn.discordapp.com/attachments/1018055445279154217/1390017579443294208/uncaption.gif?ex=68f3cac0&is=68f27940&hm=e55070068622591aa75ea39e97be9515fb20867702e24b65faf256823e52da44&'
  ];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  await message.channel.send(randomResponse);
  console.log(`User ${message.author.tag} used +gif with gif ${randomResponse}`);
};
