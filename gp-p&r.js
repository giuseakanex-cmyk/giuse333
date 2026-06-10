let handler = async (m, { conn, text, command }) => {
  let action, successTitle, errorMsg
  let sender = m.sender

  // 🔥 PRENDE TUTTI GLI UTENTI TAGGATI
  let users = []

  if (m.mentionedJid && m.mentionedJid.length > 0) {
    users = m.mentionedJid
  } else if (m.quoted && m.quoted.sender) {
    users = [m.quoted.sender]
  } else if (text) {
    let numbers = text.split(/[\s,]+/).filter(v => !isNaN(v))
    users = numbers.map(n => n + '@s.whatsapp.net')
  }

  if (!users.length) {
    return conn.reply(m.chat, '⚠️ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • Devi menzionare almeno un utente per il rituale!', m)
  }

  if (['promote', 'promuovi', 'p', 'p2'].includes(command)) {
    action = 'promote'
    successTitle = '⚡ PROMOZIONE COMPLETATA ⚡'
    errorMsg = '💀 Il rituale di potere è fallito!'
  }

  if (['demote', 'retrocedi', 'r'].includes(command)) {
    action = 'demote'
    successTitle = '☠️ RETROCESSIONE COMPLETATA ☠️'
    errorMsg = '💀 Tentativo di abbassamento fallito!'
  }

  try {
    // Esecuzione dell'azione nel gruppo
    await conn.groupParticipantsUpdate(m.chat, users, action)

    // Recupero dell'immagine profilo dell'utente che esegue il comando
    let profilePicture
    try {
      profilePicture = await conn.profilePictureUrl(sender, 'image')
    } catch (e) {
      // Immagine di fallback se l'utente ha la privacy restrittiva
      profilePicture = 'https://files.catbox.moe/pyp87f.jpg'
    }

    let tagList = users.map(u => '@' + u.split('@')[0]).join(' ')

    let successMsg = `
╭━━━⚡ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ⚡━━━╮
│ 🔥 RITUALE DI COMANDO ESEGUITO
│
│ 👥 Bersagli: ${tagList}
│ ✨ Azione: ${successTitle}
│ 🕷️ Da: @${sender.split('@')[0]}
│
│ ☠️ The Danger osserva...
╰━━━━━━━━━━━━━━━━╯
`.trim()

    // Configurazione del messaggio Fake Contact +0 (Stile Danger Bot)
    const fakeMsg = {
      key: {
        participants: "0@s.whatsapp.net",
        fromMe: false,
        id: "DangerRitualCore"
      },
      message: {
        contactMessage: {
          displayName: `𝐓𝐇𝐄 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • +0`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Danger;Bot;;;\nFN:𝐓𝐇𝐄 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • +0\nitem1.TEL;waid=0:0\nitem1.X-ABLabel:DangerCore\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    }

    // Invio del messaggio come immagine (profilo dell'esecutore) con il testo come didascalia, citando il +0
    await conn.sendMessage(m.chat, {
      image: { url: profilePicture },
      caption: successMsg,
      mentions: [sender, ...users]
    }, { quoted: fakeMsg })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, `💀 ${errorMsg}`, m)
  }
}

handler.command = ['promote', 'promuovi', 'p', 'p2', 'demote', 'retrocedi', 'r']
handler.group = true
handler.owner = true
handler.botAdmin = true

export default handler
