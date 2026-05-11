import 'os'
import 'util'
import 'human-readable'
import '@realvare/baileys'
import 'perf_hooks'

let handler = async (m, { conn, usedPrefix }) => {

  const chat = global.db.data.chats[m.chat] || {}

  const {
    detect,
    jadibot,
    welcome,
    sologruppo,
    soloprivato,
    modoadmin,
    isBanned,
    antiPorno,
    antiCall,
    antitraba,
    antiArab,
    antiLink,
    antilinkig,
    antilinktiktok,
    antilinktg,
    antimedia
  } = chat

  const menuFunzioniText = 
`╭─────────╮
┃ ⚙️ 𝐌𝐄𝐍𝐔 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈 𝐃𝐈\n┃ ꙰  𝟥𝟥𝟥 𝔹𝕆𝕋  ꙰
┃━━━━━━━━━━━━━━
┃${detect ? '✅' : '❌'} ⮕ ${usedPrefix}𝐝𝐞𝐭𝐞𝐜𝐭    
┃${jadibot ? '✅' : '❌'} ⮕ ${usedPrefix}𝐣𝐚𝐝𝐢𝐛𝐨𝐭  
┃${welcome ? '✅' : '❌'} ⮕ ${usedPrefix}𝐛𝐞𝐧𝐯𝐞𝐧𝐮𝐭𝐨  
┃${sologruppo ? '✅' : '❌'} ⮕ ${usedPrefix}𝐬𝐨𝐥𝐨𝐠𝐫𝐮𝐩𝐩𝐨  
┃${soloprivato ? '✅' : '❌'} ⮕ ${usedPrefix}𝐬𝐨𝐥𝐨𝐩𝐫𝐢𝐯𝐚𝐭𝐨  
┃${modoadmin ? '✅' : '❌'} ⮕ ${usedPrefix}𝐦𝐨𝐝𝐨𝐚𝐝𝐦𝐢𝐧  
┃${isBanned ? '✅' : '❌'} ⮕ ${usedPrefix}𝐛𝐚𝐧𝐠𝐩  
┃${antiPorno ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐩𝐨𝐫𝐧𝐨  
┃${antiCall ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐜𝐚𝐥𝐥  
┃${antitraba ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐭𝐫𝐚𝐯𝐚  
┃${antiArab ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐩𝐚𝐤𝐢  
┃${antiLink ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤  
┃${antilinkig ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤𝐢𝐠  
┃${antilinktiktok ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤𝐭𝐢𝐤𝐭𝐨𝐤 
┃${antilinktg ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤𝐭𝐠  
┃${antimedia ? '✅' : '❌'} ⮕ ${usedPrefix}𝐚𝐧𝐭𝐢𝐦𝐞𝐝𝐢𝐚 
┃━━━━━━━━━━━━━━
> ℹ️ 𝐈𝐍𝐅𝐎  
> ✅ = 𝐀𝐭𝐭𝐢𝐯𝐨  
> ❌ = 𝐃𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐨  
┃━━━━━━━━━━━━━━
> ℹ️ 𝐔𝐒𝐎  
> ${usedPrefix}𝐚𝐭𝐭𝐢𝐯𝐚 𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤  
> ${usedPrefix}𝐝𝐢𝐬𝐚𝐛𝐢𝐥𝐢𝐭𝐚 𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤  
╰─────────╯
`.trim()

  await conn.sendMessage(m.chat, {
    text: menuFunzioniText,

    contextInfo: {
      externalAdReply: {
        title: "𝐌𝐄𝐍𝐔 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈 ⚙️",
        body: "𝐞𝐧𝐭𝐫𝐚 𝐧  𝐥 𝐜𝐚𝐧𝐚𝐥𝐞 𝐝𝐢 𝟑𝟑𝟑 𝐁𝐎𝐓!",
        thumbnailUrl: "https://files.catbox.moe/vrcx1e.jpeg",
        sourceUrl: "https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h",
        mediaType: 1,
        renderLargerThumbnail: true,
        showAdAttribution: false
      }
    }

  }, { quoted: m })
}

handler.help = ['funzioni']
handler.tags = ['menu']
handler.command = /^(funzioni)$/i

export default handler