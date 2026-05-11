//Codice di VISUALIZZA_ADMIN.js

const handler = m => m
handler.all = async function (m) {
const chat = global.db.data.chats[m.chat]
if (m.messageStubType == 29) { 
    let pic
  try {
    pic = await conn.profilePictureUrl(m.messageStubParameters[0], 'image');
  } catch (error) {
    pic = null
  }
conn.sendMessage(m.chat, {
    text: `@${m.sender.split('@')[0]} 𝐡𝐚 𝐝𝐚𝐭𝐨 𝐢 𝐩𝐨𝐭𝐞𝐫𝐢 𝐚 @${m.messageStubParameters[0].split('@')[0]}`,
    contextInfo: {
      mentionedJid: [m.sender, m.messageStubParameters[0]],
      externalAdReply: {
        title: `𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐢 𝐩𝐫𝐨𝐦𝐨𝐳𝐢𝐨𝐧𝐞 👑`,
        thumbnail: pic ? await (await fetch(pic)).buffer() : await (await fetch('https://telegra.ph/file/17e7701f8b0a63806e312.png')).buffer(),
      }
    }
  }, { quoted: null })}
if (m.messageStubType == 30) { 
let pic
  try {
    pic = await conn.profilePictureUrl(m.messageStubParameters[0], 'image');
  } catch (error) {
    pic = null
  }
conn.sendMessage(m.chat, {
    text: `@${m.sender.split('@')[0]} 𝐡𝐚 𝐥𝐞𝐯𝐚𝐭𝐨 𝐢 𝐩𝐨𝐭𝐞𝐫𝐢 𝐚 @${m.messageStubParameters[0].split('@')[0]}`,
    contextInfo: {
      mentionedJid: [m.sender, m.messageStubParameters[0]],
      externalAdReply: {
        title: `𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐢 𝐫𝐞𝐭𝐫𝐨𝐜𝐞𝐬𝐬𝐢𝐨𝐧𝐞 🙇🏻‍♂️`,
        thumbnail: pic ? await (await fetch(pic)).buffer() : await (await fetch('https://telegra.ph/file/17e7701f8b0a63806e312.png')).buffer(),
      }
    }
  }, { quoted: null })}
}
export default handler