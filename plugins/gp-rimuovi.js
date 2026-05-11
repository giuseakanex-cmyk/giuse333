import fs from 'fs'

async function handler(m, {
isBotAdmin, isOwner, text, conn
}) {

if (!isBotAdmin) return m.reply('ⓘ 𝐃𝐞𝐯𝐨 𝐞𝐬𝐬𝐞𝐫𝐞 𝐚𝐝𝐦𝐢𝐧 𝐩𝐞𝐫 𝐩𝐨𝐭𝐞𝐫 𝐟𝐮𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞')

 const mention = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.quoted
  const who = mention ? mention : m.sender
  const user = global.db.data.users[who] || {}


if (!mention) return m.reply('ⓘ 𝐌𝐞𝐧𝐳𝐢𝐨𝐧𝐚 𝐥𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚 𝐝𝐚 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐞')

if (mention == m.sender) return m.reply('ⓘ 𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐞 𝐭𝐞 𝐬𝐭𝐞𝐬𝐬𝐨')

const groupMetadata =
conn.chats[m.chat].metadata

const participants = 
groupMetadata.participants 

const utente = 
participants.find(u => conn.decodeJid(u.id) === mention)

const owner = 
utente?.admin == 'superadmin'

const admin =
utente?.admin == 'admin'

if (owner) return m.reply(`> ⚠️ 𝐀𝐧𝐭𝐢-𝐊𝐢𝐜𝐤\n> ⓘ 𝐋'𝐮𝐭𝐞𝐧𝐭𝐞 𝐜𝐡𝐞 𝐡𝐚𝐢 𝐩𝐫𝐨𝐯𝐚𝐭𝐨 𝐚 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐞 𝐞́ 𝐢𝐥 𝐜𝐫𝐞𝐚𝐭𝐨𝐫𝐞 𝐝𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨, 𝐫𝐢𝐩𝐫𝐨𝐯𝐚𝐜𝐢 𝐬𝐚𝐫𝐚𝐢 𝐩𝐢𝐮̀ 𝐟𝐨𝐫𝐭𝐮𝐧𝐚𝐭𝐨.`)

if (admin) return m.reply(`> ⚠️ 𝐀𝐧𝐭𝐢-𝐊𝐢𝐜𝐤\n> ⓘ 𝐋'𝐮𝐭𝐞𝐧𝐭𝐞 𝐜𝐡𝐞 𝐡𝐚𝐢 𝐩𝐫𝐨𝐯𝐚𝐭𝐨 𝐚 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐞 𝐞́ 𝐚𝐝𝐦𝐢𝐧, 𝐫𝐢𝐩𝐫𝐨𝐯𝐚𝐜𝐢 𝐬𝐚𝐫𝐚𝐢 𝐩𝐢𝐮̀ 𝐟𝐨𝐫𝐭𝐮𝐧𝐚𝐭𝐨.`)

async function remove() {

const fake = {
key: {
participants: "0@s.whatsapp.net", 
fromMe: false, 
id: "Halo"
}, message: { 
locationMessage: {
name: '𝐑𝐢𝐦𝐨𝐳𝐢𝐨𝐧𝐞 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨…',
jpegThumbnail: await (await fetch('https://telegra.ph/file/39a7c4740ee114542a7cf.png')).buffer(),
}}, participant: "0@s.whatsapp.net"
} 

const reason = 
text ? '\n\n> 𝐌𝐨𝐭𝐢𝐯𝐨: ' + text.replace(m.sender, '') : ''

let pic;
  try {
    pic = await conn.profilePictureUrl(mention, 'image');
  } catch (error) {
    pic = null;
  }

  conn.sendMessage(m.chat, {
    text: `@${mention.split`@`[0]} 𝐫𝐢𝐦𝐨𝐬𝐬𝐨 𝐝𝐚 @${m.sender.split`@`[0]} ${reason.capitalize()}`,
    contextInfo: {
      mentionedJid: [mention, m.sender, conn.parseMention(text)],
      externalAdReply: {
        title: `${user.name}`,
        body: '',
        sourceUrl: "https://wa.me/" + (mention ? mention.split("@")[0] : m.sender.split("@")[0]),
        thumbnail: pic ? await (await fetch(pic)).buffer() : await (await fetch('https://telegra.ph/file/560f1667a55ecf09650cd.png')).buffer()
      }
    }
  }, { quoted: fake })

conn.groupParticipantsUpdate(m.chat, [mention], 'remove')}

  if (mention) await remove()

}


handler.customPrefix = /kick|sparisci|puffo/i
handler.tags = ['admin'];
handler.help = ['𝐤𝐢𝐜𝐤/𝐩𝐮𝐟𝐟𝐨/𝐬𝐩𝐚𝐫𝐢𝐬𝐜𝐢'];
handler.command = new RegExp
handler.group = true;
handler.admin = true;
handler.botAdmin = true;
export default handler;