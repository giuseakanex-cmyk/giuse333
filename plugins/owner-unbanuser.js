import fetch from "node-fetch"

let handler = async (m, { conn, text }) => {

  let who

  if (m.mentionedJid && m.mentionedJid.length > 0) {
    who = m.mentionedJid[0]
  } else if (m.quoted) {
    who = m.quoted.sender
  } else if (text) {
    who = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
  }

  if (!who) return m.reply('❌ Tagga, rispondi o scrivi un numero')

  global.db.data.users = global.db.data.users || {}
  global.db.data.users[who] = global.db.data.users[who] || {}

  global.db.data.users[who].banned = false
  global.db.data.users[who].notifiedBan = false

  let number = who.split('@')[0]
  let tag = '@' + number

  let thumbnail = await (await fetch("https://telegra.ph/file/592a9dbbe01cfaecbefb8.png")).buffer()

  await conn.sendMessage(m.chat, {
    text: `✅ *UTENTE SBANNATO*\n\n👤 ${tag}\n📞 wa.me/${number}`,
    mentions: [who],
    contextInfo: {
      externalAdReply: {
        title: '✅ UNBANUSER',
        body: `${tag} è tornato tra i vivi`,
        thumbnail: thumbnail,
        sourceUrl: 'https://wa.me/' + number,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m })
}

handler.command = /^unbanuser$/i
handler.owner = true

export default handler