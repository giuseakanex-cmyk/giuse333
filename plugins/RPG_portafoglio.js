const handler = async (m, { conn, args }) => {

  const who = m.sender // SOLO se stesso, fine dei giochi

  const users = global.db.data.users

  if (!users[m.sender]) {
    users[m.sender] = { pin: null }
  }

  if (!users[who]) {
    users[who] = {
      money: 0,
      bank: 0,
      furti: 0,
      rubati: 0,
      datafurto: "Nessuno",
      iban: null,
      card: null
    }
  }

  const me = users[m.sender]
  const user = users[who]

  if (!me.pin)
    return m.reply("🔐 Imposta prima un PIN con .impostapin")

  const input = args[0]

  if (!input)
    return m.reply("🔐 Scrivi il PIN così:\n.portafoglio 1234")

  if (input !== me.pin)
    return m.reply("❌ PIN ERRATO")

  if (!user.card) {
    user.card = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10))
      .join('')
      .replace(/(.{4})/g, '$1 ')
      .trim()
  }

  const money = Number(user.money) || 0
  const bank = Number(user.bank) || 0
  const nfurti = user.furti || 0
  const totaleRubato = user.rubati || 0
  const data_furto = user.datafurto || "Nessuno"
  const iban = user.iban ? user.iban : "Non assegnato"

  const tag = '@' + who.split('@')[0]

  await conn.sendMessage(m.chat, {
    text: `💳 Accesso alla carta...\n👤 ${tag}\n💳 ${user.card}`,
    mentions: [who]
  }, { quoted: m })

  await new Promise(resolve => setTimeout(resolve, 3000))

  let testo = `═════ ೋೋ═════
𝐏𝐎𝐑𝐓𝐀𝐅𝐎𝐆𝐋𝐈𝐎 👛
𝐂𝐚𝐫𝐭𝐚: ${money} €
𝐁𝐚𝐧𝐜𝐚: ${bank} €
𝐍𝐮𝐦𝐞𝐫𝐨 𝐜𝐚𝐫𝐭𝐚: ${user.card}
𝐈𝐁𝐀𝐍: ${iban}
═════ ೋೋ═════
𝐅𝐔𝐑𝐓𝐈 🥷
𝐅𝐮𝐫𝐭𝐢 𝐭𝐨𝐭𝐚𝐥𝐢: ${nfurti}
𝐔𝐥𝐭𝐢𝐦𝐨 𝐟𝐮𝐫𝐭𝐨: ${data_furto}
𝐓𝐨𝐭𝐚𝐥𝐞: ${totaleRubato} €
═════ ೋೋ═════`

  let prova = {
    key: {
      participants: "0@s.whatsapp.net",
      fromMe: false,
      id: "Halo"
    },
    message: {
      contactMessage: {
        displayName: `𝐁𝕀𝐋𝚲𝐍𝐂𝕀Ꮻ`,
        vcard: `BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:y
item1.TEL;waid=${who.split('@')[0]}:${who.split('@')[0]}
item1.X-ABLabel:Ponsel
END:VCARD`
      }
    },
    participant: "0@s.whatsapp.net"
  }

  conn.reply(m.chat, testo, prova)
}

handler.command = /^portafoglio|budget|soldi|tasca|cash$/i
export default handler