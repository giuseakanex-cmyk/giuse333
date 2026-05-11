export async function before(m) {

  const user = global.db.data.users[m.sender]
  if (!user) return

  if (!user.lvl) user.lvl = 0
  if (!user.money) user.money = 0

  if (!user.rankStart) {
    user.rankStart = Date.now()
    user.msgCount = 0
  }

  if (m.fromMe || m.isBaileys || !m.text) return

  user.msgCount += 1

  const LEVEL_STEP = 300

  if (user.msgCount >= LEVEL_STEP) {

    user.msgCount = 0
    user.lvl += 1

    let reward = user.lvl * 50
    user.money += reward

    await global.conn.sendMessage(m.chat, {
      text: `
🎉 LEVEL UP!

@${m.sender.split('@')[0]}

🏆 Livello: ${user.lvl}
💰 +${reward}€
📊 *prossimo rank tra 300 livelli*
> *digita ‘’.rank’’ per vedere il tuo rank*
`,
      mentions: [m.sender]
    })
  }
}