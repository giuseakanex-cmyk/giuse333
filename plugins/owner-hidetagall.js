let handler = async (m, { conn, text }) => {

    if (!text) return conn.reply(m.chat, "Scrivi messaggio", m)

    global.db.data.chats = global.db.data.chats || {}

    let chats = Object.keys(global.db.data.chats)
        .filter(jid => jid.endsWith('@g.us')) 

    let success = 0
    let failed = 0
    let deleted = 0

    for (let jid of chats) {
        try {

            await conn.sendMessage(jid, { text })
            success++

        } catch (e) {

            failed++

            console.log("❌ ERRORE:", jid)

            if (e?.data === 403) {
                delete global.db.data.chats[jid]
                deleted++
            }
        }
    }

    await conn.reply(m.chat,
`📢 HIDETAGALL

✅ Inviati: ${success}
❌ Errori: ${failed}
🗑️ Eliminati: ${deleted}`, m)
}

handler.command = ['hidetagall']
handler.owner = true

export default handler