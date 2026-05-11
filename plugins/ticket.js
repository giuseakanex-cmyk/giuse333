//Codice di testbot.js

import { generateWAMessageFromContent, proto } from '@realvare/baileys'

const SUPPORT_GROUP = 'B5xl4xXpCQJHiU3ZSK5FSw'
const pendingFirma = {}

const getGroupJid = async (conn) => {
  try {
    const meta = await conn.groupGetInviteInfo(SUPPORT_GROUP)
    return meta.id
  } catch {
    return null
  }
}

let handler = async (m, { conn, text, command }) => {
  if (!global.db.data.tickets) global.db.data.tickets = {}
  const cmd = command?.toLowerCase()

  if (cmd === 'ticket') {
    if (!text || text.trim().length < 10)
      return m.reply('❌ Scrivi un motivo di almeno *10 caratteri*.\nEsempio: .ticket non riesco ad accedere al gruppo')

    const groupJid = await getGroupJid(conn)
    if (!groupJid) return m.reply('❌ Errore nel trovare il gruppo di supporto.')

    const ticketId = `TKT-${Date.now()}`
    const numero = m.sender.split('@')[0]

    global.db.data.tickets[ticketId] = {
      sender: m.sender,
      chat: m.chat,
      motivo: text.trim(),
      numero,
      status: 'open',
      timestamp: Date.now()
    }

    await conn.sendMessage(groupJid, {
      text:
`🎫 *NUOVO TICKET* — ${ticketId}

👤 Utente: *+${numero}*
💬 Motivo:
${text.trim()}

📝 Rispondi con *.risposta ${ticketId} [testo]*`,
      mentions: []
    })

    return m.reply(
`✅ *Ticket aperto con successo!*

🎫 ID: *${ticketId}*
📨 Il nostro staff ti risponderà il prima possibile.`)
  }

  if (cmd === 'risposta') {
    const parts = text?.trim().split(' ')
    if (!parts || parts.length < 2)
      return m.reply('❌ Uso: *.risposta TKT-123456 testo della risposta*')

    const ticketId = parts[0].toUpperCase()
    const testo = parts.slice(1).join(' ')

    const ticket = global.db.data.tickets[ticketId]
    if (!ticket) return m.reply(`❌ Ticket *${ticketId}* non trovato.`)
    if (ticket.status === 'closed') return m.reply(`⚠️ Ticket *${ticketId}* già chiuso.`)

    pendingFirma[m.sender] = { ticketId, testo }

    return await conn.sendMessage(m.chat, {
      text:
`✏️ *Firma il messaggio*

Scrivi il tuo *nome* per firmare la risposta al ticket *${ticketId}*:`,
      buttons: [
        { buttonId: `.annullafirma`, buttonText: { displayText: '❌ Annulla' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (cmd === 'annullafirma') {
    delete pendingFirma[m.sender]
    return m.reply('🗑️ Risposta annullata.')
  }
}

handler.all = async function (m) {
  if (!m.text || m.fromMe) return
  if (!pendingFirma[m.sender]) return

  const { ticketId, testo } = pendingFirma[m.sender]
  const firma = m.text.trim()
  delete pendingFirma[m.sender]

  const ticket = global.db.data.tickets?.[ticketId]
  if (!ticket) return

  ticket.status = 'closed'
  ticket.closedBy = firma

  try {
    await this.sendMessage(ticket.sender, {
      text:
`📩 *Risposta al tuo ticket* — ${ticketId}

${testo}

━━━━━━━━━━━━
✍️ Firmato: *${firma}*
🏷️ 333 Staff`
    })

    await this.sendMessage(m.chat, {
      text:
`✅ Risposta inviata a *+${ticket.numero}*

🎫 Ticket *${ticketId}* chiuso.
✍️ Firmato da: *${firma}*`
    })
  } catch (e) {
    await this.sendMessage(m.chat, {
      text: `❌ Errore nell'invio: ${e.message}`
    })
  }
}

handler.command = /^(ticket|risposta|annullafirma)$/i
export default handler