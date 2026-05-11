let handler = async (m, { conn, participants, command }) => {

  let total = 0
  let sider = []

  for (let user of participants) {
    let jid = user.id
    let userData = global.db.data.users[jid]

    let messages = userData?.messaggi || 0 // usa 'messaggi' invece di 'chat'

    if (
      messages < 5 && // 🔥 soglia inattività
      !user.isAdmin &&
      !user.isSuperAdmin &&
      userData?.whitelist !== true
    ) {
      total++
      sider.push(jid)
    }
  }

  if (command === "inattivi") {
    if (total === 0) {
      return conn.reply(m.chat, 
`╭━━• 𝐍𝐎 𝐈𝐍𝐀𝐓𝐓𝐈𝐕𝐈 •━━╮
╰━━━━━━━━━━━━━━━╯`, m)
    }

    return conn.reply(m.chat,
`╭━━━━━━━━━━━━━━━╮
┃ 𝐈𝐍𝐀𝐓𝐓𝐈𝐕𝐈 😴
┃
┃ 𝐓𝐨𝐭𝐚𝐥𝐞: ${sider.length}
${sider.map(v => '┣➤ @' + v.split('@')[0]).join('\n')}
╰━━━━━━━━━━━━━━━╯`,
      m,
      { mentions: sider }
    )
  }

  if (command === "viainattivi") {
    if (total === 0) {
      return conn.reply(m.chat, 
`╭━━• 𝐍𝐎 𝐈𝐍𝐀𝐓𝐓𝐈𝐕𝐈 •━━╮
╰━━━━━━━━━━━━━━━╯`, m)
    }

    await conn.reply(m.chat,
`╭━━━━━━━━━━━━━━━╮
┃ 𝐑𝐈𝐌𝐎𝐙𝐈𝐎𝐍𝐄 🚫
${sider.map(v => '┣➤ @' + v.split('@')[0]).join('\n')}
╰━━━━━━━━━━━━━━━╯`,
      m,
      { mentions: sider }
    )

    await conn.groupParticipantsUpdate(m.chat, sider, 'remove')
  }
}

handler.command = /^(inattivi|viainattivi)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler