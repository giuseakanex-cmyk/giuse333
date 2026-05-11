let handler = async (m, { conn, args }) => {
let group = m.chat
let prova = { "key": {"participants":"0@s.whatsapp.net", "fromMe": false, "id": "Halo"
  }, "message": {
  "locationMessage": { name: '𝐋͎𝕀𝐍𝐊 𝐃𝚵𝐋͎ 𝐆𝐑𝐔𝐏𝐏Ꮻ 🔗',
"jpegThumbnail": fs.readFileSync('./icone/link.png'),
"vcard":
`BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
}}, "participant": "0@s.whatsapp.net"
}
let link = 'https://chat.whatsapp.com/' + await conn.groupInviteCode(group)
conn.reply(m.chat, link, prova, m, {detectLink: true})
//conn.sendMessage(m.chat, { text: link }, { quoted: m, detectLink: true })
}
handler.command = /^link(gro?up)?$/i
handler.tags = ['admin'];
handler.help = ['𝐥𝐢𝐧𝐤'];
handler.group = true
handler.admin = true
handler.botAdmin = true
export default handler