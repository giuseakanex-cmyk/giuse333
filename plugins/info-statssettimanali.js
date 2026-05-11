let lastReset = null

async function generaReportSettimanale(
    conn,
    chatId,
    chatData,
    posizione,
    totaleGruppi,
    sopraMsg
) {

    const weekMsg = chatData.weekMsg || 0
    const weekUsers = chatData.weekUsers || {}

    const usersSorted = Object.entries(weekUsers)
        .filter(([jid]) => !jid.endsWith('@g.us'))
        .sort((a, b) => b[1] - a[1])

    const top3 = usersSorted.slice(0, 3)
    const least = usersSorted[usersSorted.length - 1]

    let mentions = []

    const classifica = top3.map((u, i) => {
        mentions.push(u[0])
        return `${["🥇", "🥈", "🥉"][i]} @${u[0].split('@')[0]} — *${u[1]}*`
    }).join('\n')

    let spammer = "Nessuno"
    let spamCount = 0

    if (usersSorted[0]) {
        spammer = `@${usersSorted[0][0].split('@')[0]}`
        spamCount = usersSorted[0][1]
        mentions.push(usersSorted[0][0])
    }

    let fantasma = "Nessuno"
    if (least) {
        fantasma = `@${least[0].split('@')[0]}`
        mentions.push(least[0])
    }

    const now = new Date()
    const day = now.getDay()

    const lunedi = new Date(now)
    lunedi.setDate(now.getDate() - (day === 0 ? 6 : day - 1))

    const domenica = new Date(lunedi)
    domenica.setDate(lunedi.getDate() + 6)

    const opt = { weekday: 'short', day: 'numeric' }
    const settimana = `${lunedi.toLocaleDateString('it-IT', opt)} - ${domenica.toLocaleDateString('it-IT', opt)}`

    const text = `
📊 𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐂𝐇𝐄 𝐒𝐄𝐓𝐓𝐈𝐌𝐀𝐍𝐀𝐋𝐈

🗓 ${settimana}

💬 Messaggi: *${weekMsg}*
👥 Utenti: *${Object.keys(weekUsers).length}*

🏆 Top 3:
${classifica || "Nessuno"}

🔥 Più attivo: ${spammer} (${spamCount})
🐌 Meno attivo: ${fantasma}

🌍 Posizione: #${posizione} / ${totaleGruppi}

${posizione > 1
? `📉 il gruppo sopra di voi ha: *${sopraMsg}* messaggi`
: `👑 Sei in testa!`}
> 𝐎𝐠𝐧𝐢 𝐝𝐨𝐦𝐞𝐧𝐢𝐜𝐚 𝐚 𝟎𝟎:𝟎𝟎 𝐬𝐢 𝐫𝐞𝐬𝐞𝐭𝐭𝐚 𝐥𝐚 𝐜𝐥𝐚𝐬𝐬𝐢𝐟𝐢𝐜𝐚 𝐬𝐞𝐭𝐭𝐢𝐧𝐚𝐧𝐚𝐥𝐞, 𝐛𝐮𝐨𝐧𝐚 𝐟𝐨𝐫𝐭𝐮𝐧𝐚!
`

    await conn.sendMessage(chatId, {
        text,
        mentions: [...new Set(mentions)]
    })
}


let handler = async (m, { conn }) => {

    const chats = Object.entries(global.db.data.chats || {})

    const gruppi = chats
        .filter(([id]) => id.endsWith('@g.us'))
        .sort((a, b) => (b[1].weekMsg || 0) - (a[1].weekMsg || 0))

    const index = gruppi.findIndex(([id]) => id === m.chat)

    if (index === -1)
        return m.reply("Gruppo non trovato nel database")

    const sopra = index > 0 ? gruppi[index - 1][1].weekMsg || 0 : null

    await generaReportSettimanale(
        conn,
        m.chat,
        gruppi[index][1],
        index + 1,
        gruppi.length,
        sopra
    )
}

handler.command = ['statssettimanali']
handler.group = true

export default handler


setInterval(() => {

    const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" })
    )

    const day = now.getDay()   
    const hour = now.getHours()
    const minute = now.getMinutes()

    if (!(day === 0 && hour === 23 && minute === 59)) return

    const resetKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`

    if (lastReset === resetKey) return
    lastReset = resetKey

    const chats = Object.entries(global.db.data.chats || {})

    for (let [id, chat] of chats) {
        if (!id.endsWith('@g.us')) continue

        chat.weekMsg = 0
        chat.weekUsers = {}
    }

    console.log("✅ Reset settimanale completato (domenica 23:59)")
}, 60000)