import fs from 'fs'

let handler = async (m, { text, usedPrefix, command, isROwner, isOwner }) => {
    // 🛡️ CONTROLLO PROTETTO OWNER & CREATORE SUPREMO
    if (!isROwner && !isOwner) {
        return m.reply('🚫 *𝐀𝐂𝐂𝐄𝐒𝐒𝐎 𝐍𝐄𝐆𝐀𝐓𝐎*\n╰➤ Non possiedi i sigilli dell\'Evocatore Supremo per manipolare i file del nucleo.')
    }

    if (!text) throw `⚠️ *𝐃𝐀𝐍𝐆𝐄𝐑 𝐒𝐘𝐒𝐓𝐄𝐌*\n╰➤ Specifica il nome dell'algoritmo (.js) da scrivere nel nucleo.\n_Esempio: ${usedPrefix + command} info-bot_`
    if (!m.quoted || !m.quoted.text) throw `🥀 *𝐄𝐑𝐑𝐎𝐑𝐄 𝐃𝐈 𝐈𝐍𝐈𝐄𝐙𝐈𝐎𝐍𝐄*\n╰➤ Devi rispondere al messaggio contenente il codice sorgente da salvare.`
    
    let path = `plugins/${text}.js`
    await fs.writeFileSync(path, m.quoted.text)
    
    let dangerMessage = `
╭━━━⚡ 𝐈𝐍𝐈𝐄𝐙𝐈𝐎𝐍𝐄 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐓𝐀 ⚡━━━╮
│ 💾 *𝕯𝖆𝖓𝖌𝖊𝖗 𝕾𝖞𝖘𝖙𝖊𝖒 • 𝕻𝖑𝖚𝖌𝖎𝖓*
│ 
│ Frammento di codice scritto con successo.
│ ╰➤ *Percorso:* ${path}
│ 
│ 💀 _Il database si sta aggiornando..._
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim()

    // Struttura del messaggio fake/location personalizzata
    let prova = { 
        "key": {
            "participants": "0@s.whatsapp.net", 
            "fromMe": false, 
            "id": "DangerPluginSave"
        }, 
        "message": { 
            "locationMessage": { 
                name: '𝐏𝐥𝐮𝐠𝐢𝐧 𝐢𝐧𝐢𝐞𝐭𝐭𝐚𝐭𝐨 ✓',
                // Fallback di sicurezza se il vecchio link telegra.ph fallisce
                "jpegThumbnail": await fetch('https://telegra.ph/file/876cc3f192ec040e33aba.png')
                    .then(res => res.buffer())
                    .catch(() => Buffer.alloc(0)),
                "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Danger;Bot;;;\nFN:DangerBot\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Creatore\nEND:VCARD`
            }
        }, 
        "participant": "0@s.whatsapp.net"
    }
    
    await conn.reply(m.chat, dangerMessage, prova)
}

handler.help = ['saveplugin <nome>']
handler.tags = ['owner']
handler.command = ["salvar", "saveplugin"]

// Blocchi di sicurezza nativi della struttura
handler.rowner = true
handler.owner = true

export default handler
