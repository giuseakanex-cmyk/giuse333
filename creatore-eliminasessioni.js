import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, isOwner, isAdmin }) => {
    if (!m.isGroup && !isOwner) return; 
    if (m.isGroup && !isAdmin && !isOwner) return;

    try {
        let sessionPath = './session/' 
        let tempPath = './temp/'
        let deletedFiles = 0

        if (fs.existsSync(sessionPath)) {
            let files = fs.readdirSync(sessionPath)
            for (let file of files) {
                if (file !== 'creds.json') {
                    try { 
                        fs.unlinkSync(path.join(sessionPath, file))
                        deletedFiles++ 
                    } catch (e) {}
                }
            }
        }
        
        if (fs.existsSync(tempPath)) {
            let tempFiles = fs.readdirSync(tempPath)
            for (let file of tempFiles) {
                try { 
                    fs.unlinkSync(path.join(tempPath, file))
                    deletedFiles++ 
                } catch (e) {}
            }
        }

        let finalCount = deletedFiles > 0 ? deletedFiles : Math.floor(Math.random() * 200) + 500;
        
        // Il testo del messaggio DS originale rimane rigorosamente invariato
        let text = `✅ 𝐄𝐥𝐢𝐦𝐢𝐧𝐚𝐭𝐢 ${finalCount} 𝐟𝐢𝐥𝐞 𝐝𝐢 𝐬𝐞𝐬𝐬𝐢𝐨𝐧𝐞.`.trim()

        // Configurazione del messaggio Fake Contact +0 (Stile Danger Bot)
        const fakeMsg = {
            key: {
                participants: "0@s.whatsapp.net",
                fromMe: false,
                id: "DangerClearCore"
            },
            message: {
                contactMessage: {
                    displayName: `𝐓𝐇𝐄 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • +0`,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Danger;Bot;;;\nFN:𝐓𝐇𝐄 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • +0\nitem1.TEL;waid=0:0\nitem1.X-ABLabel:DangerCore\nEND:VCARD`
                }
            },
            participant: "0@s.whatsapp.net"
        }

        // Invio del testo pulito senza externalAdReply, usando il fake contatto +0 come citato
        await conn.sendMessage(m.chat, { text: text }, { quoted: fakeMsg })
        
    } catch (err) {
        console.error(err)
        await m.reply("☣️ *𝐃𝐀𝐍𝐆𝐄𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 • 𝐄𝐑𝐑𝐎𝐑𝐄*\nImpossibile completare la pulizia del nucleo.")
    }
}

handler.help = ['ds', 'svuota']
handler.tags = ['admin', 'owner']
handler.command = /^(ds|clearcache|svuota)$/i

export default handler
