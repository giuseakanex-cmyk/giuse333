//Codice di fun-tette.js

//Codice di fun-tette.js

let handler = async (m, { conn, command, text }) => {
let target = m.mentionedJid?.[0] 
  || m.quoted?.sender 
  || m.sender

let number = target.split("@")[0]
    // Lista di dimensioni casuali
    let boobsSizes = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava', 'nona', 'decima'];

    // Scegli una dimensione casuale dalla lista
    let size = pickRandom(boobsSizes);

    // Crea il messaggio con la dimensione scelta
    let boobs = `*🍒 𝐂𝐀𝐋𝐂𝐎𝐋𝐈𝐀𝐌𝐎 𝐋𝐄 𝐓𝐔𝐄 𝐁𝐎𝐎𝐁𝐒 🍒*\n
━━━━━━━━━━━━━━━━
*@${number}* 𝐡𝐚 𝐮𝐧𝐚 *${size}*
━━━━━━━━━━━━━━━━\n> 𝟥𝟥𝟥 𝔹𝕆𝕋`.trim()

    // Rispondi con il messaggio e la menzione
    m.reply(boobs, null, { mentions: conn.parseMention(boobs) })
}

// Funzione per scegliere un elemento casuale dalla lista
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

handler.help = ['𝐭𝐞𝐭𝐭𝐞 @𝐭𝐚𝐠']
handler.tags = ['fun']
handler.command = /^(tette)$/i

export default handler;