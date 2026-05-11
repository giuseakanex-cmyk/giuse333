let handler = async (m, { conn, command, text }) => {
let target = m.mentionedJid?.[0] 
  || m.quoted?.sender 
  || m.sender

let number = target.split("@")[0]
    // Lista di dimensioni casuali
    let boobsSizes = ['floscio', 'palestrato', 'pieno di cellulite', 'piccolo', 'smerdato', 'peloso', 'enorme', 'piatto'];

    // Scegli una dimensione casuale dalla lista
    let size = pickRandom(boobsSizes);

    // Crea il messaggio con la dimensione scelta
    let boobs = `*🍑 𝐂𝐀𝐋𝐂𝐎𝐋𝐈𝐀𝐌𝐎 𝐈𝐋 𝐓𝐔𝐎 𝐂𝐔𝐋𝐄𝐓𝐓𝐎 🍑*\n
━━━━━━━━━━━━━━━━
*@${number}* 𝐡𝐚 𝐢𝐥 𝐜𝐮𝐥𝐨 *${size}*
━━━━━━━━━━━━━━━━\n> 𝟥𝟥𝟥 𝔹𝕆𝕋`.trim()

    // Rispondi con il messaggio e la menzione
    m.reply(boobs, null, { mentions: conn.parseMention(boobs) })
}

// Funzione per scegliere un elemento casuale dalla lista
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

handler.help = ['𝐜𝐮𝐥𝐨 @𝐭𝐚𝐠']
handler.tags = ['fun']
handler.command = /^(culo)$/i

export default handler;