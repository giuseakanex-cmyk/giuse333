import '@realvare/baileys';

let handler = async (m, { conn, usedPrefix }) => {
  const senderName = await conn.getName(m.sender);
  const targetJid = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;

  let profilePicBuffer;
  try {
    const url = await conn.profilePictureUrl(targetJid, 'image');
    profilePicBuffer = await (await fetch(url)).buffer();
  } catch {
    profilePicBuffer = await (await fetch('https://telegra.ph/file/22b3e3d2a7b9f346e21b3.png')).buffer();
  }

  const botName = global.db.data.nomedelbot || " ꙰ 𝟥𝟥𝟥 𝔹𝕆𝕋  ꙰";
  const botVersion = global.db.data.version || "10.0.0";

  const commandList = `
╭─────────╮  
┃ ⚡️ 𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋𝐄 𝐃𝐈\n┃ ꙰  𝟥𝟥𝟥 𝔹𝕆𝕋  ꙰
┃━━━━━━━━━━━━━━
┃⮕ ${usedPrefix}𝐒𝐓𝐀𝐅𝐅
┃⮕ ${usedPrefix}𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈
┃⮕ ${usedPrefix}𝐀𝐃𝐌𝐈𝐍
┃⮕ ${usedPrefix}𝐆𝐈𝐎𝐂𝐇𝐈
┃⮕ ${usedPrefix}𝐑𝐏𝐆
┃⮕ ${usedPrefix}𝐀𝐔𝐃𝐈𝐎
┃⮕ ${usedPrefix}𝐎𝐖𝐍𝐄𝐑
╰─────────╯
🚀 𝑩𝒐𝒕: ${botName}
🌟 *𝑽𝑬𝑹𝑺𝑰𝑶𝑵𝑬:* ${botVersion}
`.trim();

  const buttons = [
    { buttonId: `${usedPrefix}staff`, buttonText: { displayText: "ℹ️ 𝐒𝐓𝐀𝐅𝐅" }, type: 1 },
    { buttonId: `${usedPrefix}funzioni`, buttonText: { displayText: "⚙️ 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈" }, type: 1 },
    { buttonId: `${usedPrefix}admin`, buttonText: { displayText: "👑 𝐀𝐃𝐌𝐈𝐍" }, type: 1 },
    { buttonId: `${usedPrefix}giochi`, buttonText: { displayText: "🎮 𝐆𝐈𝐎𝐂𝐇𝐈" }, type: 1 },
    { buttonId: `${usedPrefix}rpg`, buttonText: { displayText: "🎰 𝐑𝐏𝐆" }, type: 1 },
    { buttonId: `${usedPrefix}menuaudio`, buttonText: { displayText: "🎵 𝐀𝐔𝐃𝐈𝐎" }, type: 1 }, // <-- nuovo pulsante audio
    { buttonId: `${usedPrefix}owner`, buttonText: { displayText: "🔐 𝐎𝐖𝐍𝐄𝐑" }, type: 1 }
  ];

  await conn.sendMessage(m.chat, {
    text: commandList,
    footer: `💡 𝐒𝐜𝐡𝐢𝐚𝐜𝐜𝐢𝐚 𝐢𝐥 𝐛𝐨𝐭𝐭𝐨𝐧𝐞 𝐝𝐞𝐥 𝐦𝐞𝐧𝐮 𝐝𝐞𝐬𝐢𝐝𝐞𝐫𝐚𝐭𝐨.`,
    buttons: buttons,
    headerType: 4,
    mentions: [targetJid],
    contextInfo: {
      externalAdReply: {
        title: senderName,
        body: `⚡️𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋𝐄`,
        mediaType: 1,
        renderLargerThumbnail: false,
        previewType: "PHOTO",
        thumbnail: profilePicBuffer,
        sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h'
      }
    }
  });
};

handler.help = ["menu"];
handler.tags = ['menu'];
handler.command = /^(menu|comandi)$/i;

export default handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}