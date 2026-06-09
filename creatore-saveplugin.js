import fs from 'fs';
import path from 'path';

const handler = async (m, { conn, usedPrefix, command, text, isOwner, isROwner }) => {
  // 🛡️ CONTROLLO DI SICUREZZA OWNER (STILE DANGER BOT)
  if (!isOwner && !isROwner) {
    return conn.reply(m.chat, `🚫 *𝐀𝐂𝐂𝐄𝐒𝐒𝐎 𝐍𝐄𝐆𝐀𝐓𝐎*\n╰➤ Non possiedi i sigilli dell'Evocatore Supremo per manipolare i file del nucleo.`, m);
  }

  if (!text) {
    return conn.reply(m.chat, `⚠️ *𝐃𝐀𝐍𝐆𝐄𝐑 𝐒𝐘𝐒𝐓𝐄𝐌*\n╰➤ Specifica il nome del frammento (.js) da scrivere nel nucleo.\n\n*—◉ Esempio*\n*◉ ${usedPrefix + command}* info-bot`, m);
  }

  if (!m.quoted || !m.quoted.text) {
    return conn.reply(m.chat, `🥀 *𝐄𝐑𝐑𝐎𝐑𝐄 𝐃𝐈 𝐈𝐍𝐈𝐄𝐙𝐈𝐎𝐍𝐄*\n╰➤ Devi rispondere al messaggio contenente il codice sorgente da salvare.`, m);
  }

  // Estrazione della lista dei plugin esistenti (Usa global.plugins per sicurezza strutturale)
  const ar = Object.keys(global.plugins || {});
  const ar1 = ar.map((v) => v.replace('.js', '').replace('plugins/', ''));

  let pluginName = text;
  if (!pluginName.endsWith('.js')) {
    pluginName = pluginName + '.js';
  }

  const filePath = path.join('plugins', pluginName);
  const giaEsiste = fs.existsSync(filePath);

  try {
    // 💾 MECCANICA DI SCRITTURA FILE
    fs.writeFileSync(filePath, m.quoted.text);

    // 🧬 MECCANICA DI COMPARAZIONE STRINGHE (Levenshtein)
    const similarities = ar1.map(name => {
      const similarity = stringSimilarity(text.toLowerCase(), name.toLowerCase());
      return { name, similarity };
    }).sort((a, b) => b.similarity - a.similarity).slice(0, 5);

    let suggestionText = '';
    if (similarities.length > 0 && similarities[0].similarity > 0.3) {
      suggestionText = `\n\n*—◉ Matrice Simile Rilevata:*\n${similarities.map(item => `*☣️* ${item.name}`).join('\n')}`;
    }

    let statusMsg = giaEsiste 
      ? `⚠️ *[SOVRASCRITTURA]* Il frammento "${pluginName}" esisteva già ed è stato rilocato nel nucleo.` 
      : `✅ *[NUOVA INIEZIONE]* Il frammento "${pluginName}" è stato generato e iniettato da zero.`;

    let dangerMsg = `
╭━━━⚡ 𝐈𝐍𝐈𝐄𝐙𝐈𝐎𝐍𝐄 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐓𝐀 ⚡━━━╮
│ 💾 *𝕯𝖆𝖓𝖌𝖊𝖗 𝕾𝖞𝖘𝖙𝖊𝖒 • 𝕻𝖑𝖚𝖌𝖎𝖓*
│ 
│ ${statusMsg}
│ ╰➤ *Percorso:* ${filePath}
│ 
│ 💀 _Il database centrale è stato aggiornato con successo._${suggestionText}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim();

    await conn.reply(m.chat, dangerMsg, m);

  } catch (error) {
    await conn.reply(m.chat, `❌ *[CRITICAL ERROR]* Impossibile scrivere il file nel server:\n\n${error.message}`, m);
  }
};

// ==========================================
// FUNZIONI MATRICIALI DI SIMILITUDINE RICHIESTE
// ==========================================
function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

handler.help = ['saveplugin <nome>'];
handler.tags = ['owner'];
handler.command = ["salvar", "saveplugin", "savepl", "addplugin"];

handler.owner = true;
handler.rowner = true;

export default handler;
