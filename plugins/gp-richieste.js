// Codice plugin: richieste.js
let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) return m.reply("❌ Questo comando si usa solo nei gruppi.");
  if (!isBotAdmin) return m.reply("❌ Devo essere admin per controllare le richieste.");
  if (!isAdmin) return m.reply("❌ Solo gli admin del gruppo possono usare questo comando.");

  try {
    const groupId = m.chat;
    const pending = await conn.groupRequestParticipantsList(groupId);

    if (!pending.length) return m.reply("✅ 𝐍𝐨𝐧 𝐜𝐢 𝐬𝐨𝐧𝐨 𝐫𝐢𝐜𝐡𝐢𝐞𝐬𝐭𝐞 𝐝𝐢 𝐩𝐚𝐫𝐭𝐞𝐜𝐢𝐩𝐚𝐳𝐢𝐨𝐧𝐞 𝐚𝐥 𝐦𝐨𝐦𝐞𝐧𝐭𝐨");

    const totalRequests = pending.length;

    const testo = `📊 𝐂𝐢 𝐬𝐨𝐧𝐨 *${totalRequests}* 𝐫𝐢𝐜𝐡𝐢𝐞𝐬𝐭𝐞 𝐝𝐢 𝐩𝐚𝐫𝐭𝐞𝐜𝐢𝐩𝐚𝐳𝐢𝐨𝐧𝐞 𝐢𝐧 𝐬𝐨𝐬𝐩𝐞𝐬𝐨\n\n𝐕𝐮𝐨𝐢 𝐚𝐯𝐯𝐢𝐬𝐚𝐫𝐞 𝐠𝐥𝐢 𝐚𝐦𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐭𝐨𝐫𝐢 𝐩𝐞𝐫 𝐚𝐜𝐜𝐞𝐭𝐭𝐚𝐫𝐥𝐞?`;

    const pulsanti = [
      ['𝐀𝐯𝐯𝐢𝐬𝐚 𝐚𝐝𝐦𝐢𝐧 👑', '.admins']
    ];

    await conn.sendButton(m.chat, testo, '𝐆𝐞𝐬𝐭𝐢𝐨𝐧𝐞 𝐑𝐢𝐜𝐡𝐢𝐞𝐬𝐭𝐞 𝟑𝟑𝟑', null, pulsanti, m);

  } catch (err) {
    console.error('[ERRORE RICHIESTE]', err);
    m.reply("❌ Errore durante la verifica delle richieste.");
  }
}

handler.command = ['richieste', 'requests'];
handler.tags = ['gruppo'];
handler.help = ['richieste - mostra solo il numero di richieste con bottone per avvisare gli admin'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;