let bombaInCorso = {}

let handler = async (m, { conn, command }) => {
    let chat = m.chat

    if (command !== 'bomba') return

    if (bombaInCorso[chat]) 
        return m.reply('⚠️ C’è già una bomba attiva. Non fate i pazzi.')

    global.cooldowns = global.cooldowns || {}
    const key = `bomba_${chat}`
    const now = Date.now()

    if (now - (global.cooldowns[key] || 0) < 5000)
        return m.reply('⏳ Calma. La miccia non è ancora pronta.')

    global.cooldowns[key] = now

    let durata = Math.floor(Math.random() * (35 - 15 + 1)) + 15
    let scadenza = Date.now() + durata * 1000

    bombaInCorso[chat] = {
        vittima: m.sender,
        passaggi: [],
        scadenza,
        timer: setTimeout(() => esplosione(chat, conn), durata * 1000)
    }

    let tag = '@' + m.sender.split('@')[0]

    await conn.sendMessage(chat, {
        text:
`💣 *BOMBA ATTIVATA*

👤 Vittima iniziale: ${tag}
⏳ Tempo: ${durata}s

Scrivi: *passa @utente*
per liberarti della bomba`,
        mentions: [m.sender]
    }, { quoted: m })
}

handler.before = async (m, { conn }) => {
    let chat = m.chat
    let b = bombaInCorso[chat]
    if (!b || !m.text) return

    if (m.sender !== b.vittima) return

    let txt = m.text.toLowerCase().trim()
    if (!txt.startsWith('passa')) return

    let target =
        m.mentionedJid?.[0] ||
        m.quoted?.sender

    if (!target || target === m.sender) return
    if (target === conn.user.jid)
        return m.reply('❌ Il bot non accetta bombe. (è vigliacco)')

    clearTimeout(b.timer)

    let remaining = b.scadenza - Date.now()
    if (remaining <= 500) return

    if (!b.passaggi.includes(m.sender))
        b.passaggi.push(m.sender)

    b.vittima = target

    b.timer = setTimeout(() => esplosione(chat, conn), remaining)

    await conn.sendMessage(chat, {
        text:
`💣 BOMBA PASSATA

➡️ Nuova vittima: @${target.split('@')[0]}
⏳ Il timer continua...`,
        mentions: [target]
    }, { quoted: m })

    return true
}

async function esplosione(chatId, conn) {
    let b = bombaInCorso[chatId]
    if (!b) return

    let users = global.db.data.users

    const penalty = 15

    if (!users[b.vittima]) users[b.vittima] = { money: 0 }

    users[b.vittima].money = Math.max(
        0,
        (users[b.vittima].money || 0) - penalty
    )

    let text =
`💥 *BOOM!*

💀 @${b.vittima.split('@')[0]} è esploso
💸 -${penalty} money`


    if (b.passaggi.length) {
        text += `\n\n🏆 Sopravvissuti:\n`

        let uniq = [...new Set(b.passaggi)]

        for (let jid of uniq) {
            if (jid === b.vittima) continue

            let reward = Math.floor(Math.random() * 20) + 10

            if (!users[jid]) users[jid] = { money: 0 }

            users[jid].money =
                (users[jid].money || 0) + reward

            text += `• @${jid.split('@')[0]} +${reward}💸\n`
        }
    }

    await conn.sendMessage(chatId, {
        text,
        mentions: [b.vittima, ...b.passaggi]
    }, { quoted: m })

    delete bombaInCorso[chatId]
}

handler.command = /^bomba$/i
handler.group = true

export default handler