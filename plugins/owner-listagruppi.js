let handler = async (m, { conn }) => {
    const botName = global.db.data?.nomedelbot || "꙰  333 BOT ꙰";
    let output = [`𝐋𝐈𝐒𝐓𝐀 𝐃𝐄𝐈 𝐆𝐑𝐔𝐏𝐏𝐈 𝐃𝐈 ${botName}`, ''];

    const groups = await conn.groupFetchAllParticipating()
    const groupList = Object.values(groups)
    groupList.sort((a, b) => b.participants.length - a.participants.length)

    output.push(`➣ 𝐓𝐨𝐭𝐚𝐥𝐞 𝐆𝐫𝐮𝐩𝐩𝐢: ${groupList.length}`, '\n══════ ೋೋ══════\n')

    const botJid = conn.decodeJid(conn.user.jid).split('@')[0]

    for (let i = 0; i < groupList.length; i++) {
        const group = groupList[i]
        const jid = group.id

        let metadata
        try { metadata = await conn.groupMetadata(jid) } catch { metadata = group }

        const participants = metadata?.participants || group.participants || []
        const totalParticipants = participants.length

        const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        const adminCount = admins.length
        const botIsAdmin = admins.some(p => {
            const pid = (p.id || '').split('@')[0].split(':')[0]
            return pid === botJid
        })

        const groupMessages = global.db.data.chats?.[jid]?.messaggi ?? 'N/D'

        // Link: 1) groupInviteCode se admin, 2) pulsante nativo revocationCode dalla metadata, 3) bio, 4) ✗
        let groupLink = '✗'
        if (botIsAdmin) {
            try {
                const code = await conn.groupInviteCode(jid)
                if (code) groupLink = `https://chat.whatsapp.com/${code}`
            } catch {}
        }
        if (groupLink === '✗') {
            // Pulsante nativo WhatsApp — salvato in metadata.inviteCode
            const nativeCode = metadata?.inviteCode || metadata?.invite_code
            if (nativeCode) groupLink = `https://chat.whatsapp.com/${nativeCode}`
        }
        if (groupLink === '✗') {
            const desc = metadata?.desc?.toString() || ''
            const match = desc.match(/https:\/\/chat\.whatsapp\.com\/\S+/)
            if (match) groupLink = match[0]
        }

        output.push(
            `➣ 𝐆𝐑𝐔𝐏𝐏Ꮻ 𝐍𝐔𝐌𝚵𝐑Ꮻ: ${i + 1}`,
            `➣ 𝐆𝐑𝐔𝐏𝐏Ꮻ: ${group.subject}`,
            `➣ 𝐏𝐀𝐑𝐓𝐈𝐂𝐈𝐏𝐀𝐍𝐓𝐈: ${totalParticipants}`,
            `➣ 𝐌𝐄𝐒𝐒𝐀𝐆𝐆𝐈: ${groupMessages}`,
            `➣ 𝐀𝐃𝐌𝐈𝐍: ${botIsAdmin ? `✓ (${adminCount})` : '✗'}`,
            `➣ 𝐈𝐃: ${jid}`,
            `➣ 𝐋𝐈𝐍𝐊: ${groupLink}`,
            '\n══════ ೋೋ══════\n'
        )
    }

    m.reply(output.join('\n'))
}

handler.command = /^(gruppi)$/i
handler.owner = true

export default handler