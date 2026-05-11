//Codice di info-msg.js

import fetch from 'node-fetch';

let handler = async (m, { conn }) => {
  const users = global.db.data.users;
  const chats = global.db.data.chats;

  const who = m.quoted 
    ? m.quoted.sender 
    : m.mentionedJid && m.mentionedJid[0] 
    ? m.mentionedJid[0] 
    : m.sender;

  if (!users[who]) {
    users[who] = {
      messaggi: 0,
      warn: 0,
      nomeinsta: '',
      blasphemy: 0,
      bank: 0
    };
  }

  const u = users[who];
  const chat = chats[m.chat] || {};
  
  const profilePic = await conn.profilePictureUrl(who, 'image').catch(() => null);
  const ppBuffer = profilePic 
    ? await (await fetch(profilePic)).buffer() 
    : await (await fetch('https://telegra.ph/file/8ca14ef9fa43e99d1d196.jpg')).buffer();

  const tag = '@' + who.split('@')[0];

  const insta = u.nomeinsta 
    ? `🤳🏻 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: @${u.nomeinsta}` 
    : '🤳🏻 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦: 𝐍𝐨𝐧 𝐢𝐦𝐩𝐨𝐬𝐭𝐚𝐭𝐨';

  const warnEmoji = u.warn === 0 ? '👌' : u.warn === 1 ? '⚠️' : '‼️';
  const curse = u.blasphemy || 0;

  const regInfo = u.registered
    ? `┃🧾 𝐍𝐨𝐦𝐞: ${u.nome}
┃🎂 𝐄𝐭𝐚̀: ${u.eta}
┃📍 𝐂𝐢𝐭𝐭𝐚̀: ${u.citta}`
    : `┃🧾 𝐑𝐞𝐠𝐢𝐬𝐭𝐫𝐚𝐳𝐢𝐨𝐧𝐞: ❌ 𝐍𝐨𝐧 𝐞𝐟𝐟𝐞𝐭𝐭𝐮𝐚𝐭𝐚`;

  let messageText = `
📌 𝐈𝐧𝐟𝐨 𝐔𝐭𝐞𝐧𝐭𝐞
╭─────────╮
┃👤 𝐔𝐭𝐞𝐧𝐭𝐞: ${tag}
┃
${regInfo}
┃
┃💬 𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢: ${u.messaggi || 0}
┃
┃💰 𝐁𝐚𝐧𝐜𝐚: ${u.bank || 0}€
┃
┃${warnEmoji} 𝐖𝐚𝐫𝐧: ${u.warn || 0} / 3
┃
┃💢 𝐁𝐞𝐬𝐭𝐞𝐦𝐦𝐢𝐞: ${curse}
┃
┃${insta}
╰─────────╯
`;

  await conn.sendMessage(m.chat, {
    text: messageText.trim(),
    contextInfo: {
      mentionedJid: [who],
      externalAdReply: {
        title: '𝐈𝐧𝐟𝐨 𝐔𝐭𝐞𝐧𝐭𝐞 𝟑𝟑𝟑',
        body: '𝐃𝐚𝐭𝐢 𝐔𝐭𝐞𝐧𝐭𝐞',
        mediaType: 1,
        thumbnail: ppBuffer,
        sourceUrl: 'https://wa.me/' + who.split('@')[0]
      }
    },
    buttons: [
  { buttonId: ".infogruppo", buttonText: { displayText: "👥 𝐈𝐧𝐟𝐨 𝐠𝐫𝐮𝐩𝐩𝐨" }, type: 1 },
  { buttonId: ".top", buttonText: { displayText: "🏆 𝐓𝐨𝐩 𝐮𝐭𝐞𝐧𝐭𝐢" }, type: 1 },
  { buttonId: ".topgruppi", buttonText: { displayText: "🌍 𝐓𝐨𝐩 𝐠𝐫𝐮𝐩𝐩𝐢" }, type: 1 },
  { buttonId: ".statsgiornaliere", buttonText: { displayText: "📊 𝐒𝐭𝐚𝐭𝐢𝐬𝐭𝐢𝐜𝐡𝐞 𝐠𝐢𝐨𝐫𝐧𝐚𝐥𝐢𝐞𝐫𝐞" }, type: 1 },
  { buttonId: ".statssettimanali", buttonText: { displayText: "📉 𝐒𝐭𝐚𝐭𝐢𝐬𝐭𝐢𝐜𝐡𝐞 𝐬𝐞𝐭𝐭𝐢𝐦𝐚𝐧𝐚𝐥𝐢" }, type: 1 }
],
    headerType: 1
  });
};

handler.command = ['info', 'bal'];
handler.tags = ['info'];
handler.help = ['infouser'];

export default handler;