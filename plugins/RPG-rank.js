let handler = async (m, { conn }) => {

  const user = global.db.data.users[m.sender]

  if (!user.msgCount) user.msgCount = 0
  if (!user.lvl) user.lvl = 0
  if (!user.money) user.money = 0

  const LEVEL_STEP = 300 

  let percent = Math.floor((user.msgCount / LEVEL_STEP) * 100)
  if (percent > 100) percent = 100

  let bar = "█".repeat(Math.floor(percent / 10)) + "░".repeat(10 - Math.floor(percent / 10))

  let missing = LEVEL_STEP - user.msgCount
  if (missing < 0) missing = 0

  let text = `
📊 *RANK SYSTEM*

👤 @${m.sender.split('@')[0]}

🏆 Livello: ${user.lvl}
💬 Progress: ${user.msgCount}/${LEVEL_STEP}

${bar} ${percent}%

📈 Mancano: ${missing}
💰 Soldi: ${user.money}€
`

  await conn.sendMessage(m.chat, {
    text,
    mentions: [m.sender]
  }, { quoted: m })
}

handler.command = ['rank']
export default handler