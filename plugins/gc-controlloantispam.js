
let handler = async (m, { conn, command, text }) => {
  if (!m.isGroup) {
    return conn.reply(m.chat, '『 ⚠️ 』 `Questo comando funziona solo nei gruppi.`', m);
  }

  const chat = global.db.data.chats[m.chat];
  
  if (!chat.antiSpam) {
    chat.antiSpam = false;
  }

  if (!text || (text.toLowerCase() !== 'on' && text.toLowerCase() !== 'off')) {
    const status = chat.antiSpam ? 'attivo ✅' : 'disattivo ❌';
    return conn.reply(m.chat, `『 ℹ️ 』 *AntiSpam è attualmente:* ${status}\n\n*Uso:*\n.antispam on\n.antispam off\n\n*Funzione:* Dopo 5 sticker l'utente viene mutato per 5 minuti`, m);
  }

  const action = text.toLowerCase();

  if (action === 'on') {
    if (chat.antiSpam) {
      return conn.reply(m.chat, '『 ℹ️ 』 `AntiSpam è già attivo in questo gruppo.`', m);
    }

    chat.antiSpam = true;

    let profilePic;
    try {
      profilePic = await conn.profilePictureUrl(m.sender, 'image');
    } catch (e) {
      profilePic = null;
    }

    const messageText = `✅ 𝐀𝐧𝐭𝐢𝐒𝐩𝐚𝐦 𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨

Gli utenti che inviano più di 5 sticker verranno mutati per 5 minuti.`;

    await conn.sendMessage(m.chat, {
      text: messageText,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363341274693350@newsletter',
          serverMessageId: -1,
          newsletterName: global.nomebot || '333'
        },
        externalAdReply: {
          title: '『 𝐀𝐍𝐓𝐈 - 𝐒𝐏𝐀𝐌 』 𝐎𝐍',
          body: 'Vai al canale 333',
          mediaType: 1,
          thumbnail: profilePic 
            ? await (await fetch(profilePic)).buffer() 
            : await (await fetch('https://telegra.ph/file/a3b727e38149464863380.png')).buffer(),
          renderLargerThumbnail: false,
          sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h'
        }
      }
    });

  } else if (action === 'off') {
    if (!chat.antiSpam) {
      return conn.reply(m.chat, '『 ℹ️ 』 `AntiSpam è già disattivo in questo gruppo.`', m);
    }

    chat.antiSpam = false;

    let profilePic;
    try {
      profilePic = await conn.profilePictureUrl(m.sender, 'image');
    } catch (e) {
      profilePic = null;
    }

    const messageText = `❌ 𝐀𝐧𝐭𝐢𝐒𝐩𝐚𝐦 𝐝𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨

Gli utenti possono inviare sticker liberamente.`;

    await conn.sendMessage(m.chat, {
      text: messageText,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363341274693350@newsletter',
          serverMessageId: -1,
          newsletterName: global.nomebot || '333'
        },
        externalAdReply: {
          title: '『 𝐀𝐍𝐓𝐈 - 𝐒𝐏𝐀𝐌 』 𝐎𝐅𝐅',
          body: 'Vai al canale 333',
          mediaType: 1,
          thumbnail: profilePic 
            ? await (await fetch(profilePic)).buffer() 
            : await (await fetch('https://telegra.ph/file/a3b727e38149464863380.png')).buffer(),
          renderLargerThumbnail: false,
          sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h'
        }
      }
    });
  }
};

handler.help = ['antispam'];
handler.tags = ['gruppo'];
handler.command = ['antispam'];
handler.group = true;
handler.admin = true;

export default handler;

