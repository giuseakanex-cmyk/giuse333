// NUCLEO CONTATORE MESSAGGI • THE DANGER BOT
const TZ = "Europe/Rome"

// Mappatura per il font personalizzato Vare Style
const vareBold = {
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
}
const toVareFont = str => str.split('').map(c => vareBold[c] || c).join('')

let handler = async (m, { conn, command, isAdmin, isOwner }) => {
    if (!m.isGroup) return conn.reply(m.chat, `☠️ ${toVareFont("SOLO GRUPPI")}\n╰➤ Questo comando può essere eseguito solo all'interno di un gruppo.`, m)

    const today = getTodayKey()
    initDay(today)

    const chatData = global.db.data.topmsgDaily.days[today].chats[m.chat] || {}
    const groupName = await conn.getName(m.chat) || "Unknown Realm"
    
    // Ordina l'array completo di tutti gli utenti attivi
    const sortedEntries = Object.entries(chatData).sort((a, b) => b[1].count - a[1].count)
    const totalGroupMessages = Object.values(chatData).reduce((sum, u) => sum + u.count, 0)

    // 1. GESTIONE COMANDO: RESET
    if (command === 'resetmsg') {
        if (!isAdmin && !isOwner) return conn.reply(m.chat, `🛡️ ${toVareFont("ACCESSO NEGATO")}\n╰➤ Solo gli amministratori o gli owner possono azzerare i contatori.`, m)
        global.db.data.topmsgDaily.days[today].chats[m.chat] = {}
        return conn.reply(m.chat, `🔄 ${toVareFont("RESET EFFETTUATO")}\n╰➤ Tutti i contatori dei messaggi di oggi per questo gruppo sono stati distrutti.`, m)
    }

    // 2. GESTIONE COMANDO: STATS PERSONALI
    if (command === 'stats') {
        const userRankIndex = sortedEntries.findIndex(e => e[0] === m.sender)
        const userMessages = chatData[m.sender]?.count || 0
        const userRank = userRankIndex !== -1 ? userRankIndex + 1 : "N/A"

        let statsText = `╭━━━⚡ ${toVareFont("STATISTICHE UTENTE")} ⚡━━━╮\n`
        statsText += `│ 👥 ${toVareFont("Gruppo")}: ${groupName}\n`
        statsText += `│ 👤 ${toVareFont("Utente")}: @${m.sender.split('@')[0]}\n`
        statsText += `│ 📊 ${toVareFont("Messaggi Oggi")}: *${userMessages}*\n`
        statsText += `│ 🏆 ${toVareFont("Posizione attuale")}: *#${userRank}*\n`
        statsText += `╰━━━━━━━━━━━━━━━━━━━━╯`
        
        return conn.sendMessage(m.chat, { text: statsText, mentions: [m.sender] }, { quoted: m })
    }

    // 3. GESTIONE COMANDI: CLASSIFICHE (top, top3, top5, top10)
    if (sortedEntries.length === 0) return conn.reply(m.chat, `☠️ ${toVareFont("NESSUN DATO")}\n╰➤ Nessun flusso di messaggi rilevato in data odierna.`, m)

    let limit = 5 // Default per il comando generico ".top" (classica)
    if (command === 'top3') limit = 3
    if (command === 'top5') limit = 5
    if (command === 'top10') limit = 10

    const slicedTop = sortedEntries.slice(0, limit)
    const medals = ["🥇", "🥈", "🥉", "🏅", "🎖️", "💀", "⚡", "⛓️", "🩸", "⚔️"]
    const mentions = slicedTop.map(([jid]) => jid)

    let topText = `╭━━━⚡ ${toVareFont("DANGER RANKING")} ⚡━━━╮\n`
    topText += `│ 👥 ${toVareFont("Gruppo")}: ${groupName}\n`
    topText += `│ 📅 ${toVareFont("Data")}: ${today}\n`
    topText += `│ 📝 ${toVareFont("Messaggi Totali")}: *${totalGroupMessages}*\n`
    topText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`
    topText += `🏆 ${toVareFont(`TOP ${limit} ATTIVITA`)}\n\n`

    slicedTop.forEach(([jid, data], i) => {
        const medal = medals[i] || "▪️"
        topText += `${medal} #*${i + 1}* @${jid.split("@")[0]} — *${data.count}*\n`
    })

    return conn.sendMessage(m.chat, { text: topText.trim(), mentions }, { quoted: m })
}

handler.before = async function (m, { conn }) {
    try {
        if (!m.message || m.isBaileys || m.fromMe || !m.isGroup) return

        const today = getTodayKey()
        initDay(today)

        const dayObj = global.db.data.topmsgDaily.days[today]
        if (!dayObj.chats[m.chat]) dayObj.chats[m.chat] = {}
        
        // Incremento del contatore messaggi dell'utente
        if (!dayObj.chats[m.chat][m.sender]) {
            dayObj.chats[m.chat][m.sender] = { count: 0 }
        }
        dayObj.chats[m.chat][m.sender].count += 1

    } catch (e) {
        console.error("Errore nel tracciamento dei messaggi interni:", e)
    }
}

function initDay(today) {
    if (!global.db.data.topmsgDaily) global.db.data.topmsgDaily = { days: {} }
    if (!global.db.data.topmsgDaily.days[today]) global.db.data.topmsgDaily.days[today] = { chats: {} }
}

function getRomeNowParts() {
    const parts = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
    const obj = {}
    for (const p of parts) if (p.type !== "literal") obj[p.type] = p.value
    return obj
}

function getTodayKey() {
    const p = getRomeNowParts()
    return `${p.year}-${p.month}-${p.day}`
}

handler.command = /^(top|top3|top5|top10|stats|resetmsg)$/i
export default handler
