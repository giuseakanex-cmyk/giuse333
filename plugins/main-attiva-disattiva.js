import fetch from 'node-fetch';

let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner }) => {

  let dynamicContextInfo = {
    externalAdReply: {
      showAdAttribution: false,
      title: " ꙰  𝟥𝟥𝟥 𝔹𝕆𝕋  ꙰",
      body: "𝐒𝐢𝐬𝐭𝐞𝐦𝐚 𝐝𝐢 𝐠𝐞𝐬𝐭𝐢𝐨𝐧𝐞 𝐟𝐮𝐧𝐳𝐢𝐨𝐧𝐢",
      thumbnailUrl: 'https://files.catbox.moe/vrcx1e.jpeg',
      sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h',
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  let isEnable = /true|enable|attiva|(turn)?on|1/i.test(command);
  if (/disable|disattiva|off|0/i.test(command)) isEnable = false;

  global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {};
  global.db.data.users[m.sender] = global.db.data.users[m.sender] || {};
  let chat = global.db.data.chats[m.chat];
  let bot = global.db.data.settings[conn.user.jid] || {};

  // ─── CATALOGHI ───────────────────────────────────────────────
  const catalogs = {
    security: ['antilink', 'antiporno', 'modoadmin'],
    protezione: ['antispam', 'antitoxic', 'antiBot', 'antivoip', 'antioneview'],
    media: ['antimedia', 'antiporno', 'antigore'],
    antilink: ['antilink', 'antilinktg', 'antilinkig', 'antilinktiktok'],
    full: ['antilink', 'antiporno', 'antigore', 'antispam', 'antitoxic', 'antiBot', 'antivoip', 'antioneview', 'antimedia', 'antilinktg', 'antilinkig', 'antilinktiktok', 'modoadmin']
  };

  const adminFeatures = [
    { key: 'welcome', name: 'Welcome', desc: 'Messaggio di benvenuto' },
    { key: 'antimedia', name: 'AntiMedia', desc: 'Blocca foto e video a più visual' },
    { key: 'goodbye', name: 'Addio', desc: 'Messaggio di addio' },
    { key: 'antispam', name: 'Antispam', desc: 'Antispam' },
    { key: 'antitoxic', name: 'Antitossici', desc: 'Avverte e rimuove per parolacce/insulti' },
    { key: 'antiBot', name: 'Antibot', desc: 'Rimuove eventuali bot indesiderati' },
    { key: 'antioneview', name: 'Antiviewonce', desc: 'Antiviewonce' },
    { key: 'rileva', name: 'Rileva', desc: 'Rileva eventi gruppo' },
    { key: 'antiporno', name: 'Antiporno', desc: 'Antiporno' },
    { key: 'antigore', name: 'Antigore', desc: 'Antigore' },
    { key: 'modoadmin', name: 'Soloadmin', desc: 'Solo gli admin possono usare i comandi' },
    { key: 'ai', name: 'IA', desc: 'Intelligenza artificiale' },
    { key: 'vocali', name: 'Siri', desc: 'Risponde con audio agli audio e msg ricevuti' },
    { key: 'antivoip', name: 'Antivoip', desc: 'Antivoip' },
    { key: 'antilinktg', name: 'AntiTelegram', desc: 'Blocca link Telegram con espulsione immediata' },
    { key: 'antilinkig', name: 'AntiInstagram', desc: 'Blocca link Instagram con warn' },
    { key: 'antilinktiktok', name: 'AntiTikTok', desc: 'Blocca link TikTok con warn' },
    { key: 'antiLink', name: 'Antilink', desc: 'Antilink whatsapp' },
    { key: 'reaction', name: 'Reazioni', desc: 'Reazioni automatiche' },
    { key: 'bestemmiometro', name: 'Bestemmiometro', desc: 'Rileva e conta le bestemmie' }
  ];

  const ownerFeatures = [
    { key: 'antiprivato', name: 'Antiprivato', desc: 'Blocca chiunque scrive in pv al bot' },
    { key: 'soloCreatore', name: 'Solocreatore', desc: 'Solo il creatore puo usare i comandi' },
    { key: 'jadibotmd', name: 'Subbots', desc: 'Subbots' },
    { key: 'read', name: 'Lettura', desc: 'Il bot legge automaticamente i messaggi' },
    { key: 'anticall', name: 'Antichiamate', desc: 'Rifiuta automaticamente le chiamate' }
  ];

  // ─── FUNZIONE TOGGLE SINGOLA FEATURE ─────────────────────────
  const toggleFeature = (type) => {
    let result = { type, status: '', success: false };
    const adminCheck = m.isGroup && !(isAdmin || isOwner || isROwner);
    const ownerOnly = !isOwner && !isROwner;
    const groupOnly = !m.isGroup && !isOwner;

    const adminGuard = () => { result.status = '𝐂𝐨𝐦𝐚𝐧𝐝𝐨 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐞 𝐬𝐨𝐥𝐨 𝐩𝐞𝐫 𝐚𝐝𝐦𝐢𝐧'; return true; };
    const ownerGuard = () => { result.status = '𝐒𝐨𝐥𝐨 𝐩𝐞𝐫 𝐨𝐰𝐧𝐞𝐫!'; return true; };
    const groupGuard = () => { result.status = '𝐂𝐨𝐦𝐚𝐧𝐝𝐨 𝐮𝐭𝐢𝐥𝐢𝐳𝐳𝐚𝐛𝐢𝐥𝐞 𝐬𝐨𝐥𝐨 𝐧𝐞𝐢 𝐠𝐫𝐮𝐩𝐩𝐢'; return true; };

    const setChat = (key) => {
      if (chat[key] === isEnable) { result.status = isEnable ? '𝐞̀ 𝐠𝐢𝐚̀ 𝐚𝐭𝐭𝐢𝐯𝐨.' : '𝐞̀ 𝐠𝐢𝐚̀ 𝐝𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨.'; return; }
      chat[key] = isEnable;
      result.status = isEnable ? '𝐀𝐭𝐭𝐢𝐯𝐚𝐭𝐨' : '𝐃𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨';
      result.success = true;
    };
    const setBot = (key) => {
      if (bot[key] === isEnable) { result.status = isEnable ? '𝐞̀ 𝐠𝐢𝐚̀ 𝐚𝐭𝐭𝐢𝐯𝐨.' : '𝐞̀ 𝐠𝐢𝐚̀ 𝐝𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨.'; return; }
      bot[key] = isEnable;
      result.status = isEnable ? '𝐀𝐭𝐭𝐢𝐯𝐚𝐭𝐨' : '𝐃𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨';
      result.success = true;
    };

    switch (type) {
      case 'welcome': case 'benvenuto':
        if (groupOnly && adminCheck) return adminGuard() && result;
        if (groupOnly) return groupGuard() && result;
        if (m.isGroup && !isAdmin && !isOwner && !isROwner) { adminGuard(); break; }
        setChat('welcome'); break;

      case 'goodbye': case 'addio':
        if (groupOnly) return groupGuard() && result;
        if (m.isGroup && !isAdmin && !isOwner && !isROwner) { adminGuard(); break; }
        setChat('goodbye'); break;

      case 'antiprivato': case 'antipriv':
        if (ownerOnly) { ownerGuard(); break; }
        setBot('antiprivato'); break;

      case 'antilinkig':
        if (adminCheck) { adminGuard(); break; }
        setChat('antilinkig'); break;

      case 'antilinktg':
        if (adminCheck) { adminGuard(); break; }
        setChat('antilinktg'); break;

      case 'antilinktiktok':
        if (adminCheck) { adminGuard(); break; }
        setChat('antilinktiktok'); break;

      case 'read': case 'lettura':
        if (ownerOnly) { ownerGuard(); break; }
        setBot('read'); break;

      case 'anticall': case 'antichiamate':
        if (ownerOnly) { ownerGuard(); break; }
        setBot('anticall'); break;

      case 'solocreatore': case 'creatore':
        if (ownerOnly) { ownerGuard(); break; }
        setBot('soloCreatore'); break;

      case 'modoadmin': case 'soloadmin':
        if (adminCheck) { adminGuard(); break; }
        setChat('modoadmin'); break;

      case 'antimedia':
        if (!m.isGroup) { groupGuard(); break; }
        if (adminCheck) { adminGuard(); break; }
        setChat('antimedia'); break;

      case 'antibot':
        if (adminCheck) { adminGuard(); break; }
        setChat('antiBot'); break;

      case 'antivoip':
        if (adminCheck) { adminGuard(); break; }
        setChat('antivoip'); break;

      case 'antitoxic': case 'antitossici':
        if (adminCheck) { adminGuard(); break; }
        setChat('antitoxic'); break;

      case 'antioneview': case 'antiviewonce':
        if (adminCheck) { adminGuard(); break; }
        setChat('antioneview'); break;

      case 'reaction': case 'reazioni':
        if (adminCheck) { adminGuard(); break; }
        setChat('reaction'); break;

      case 'bestemmiometro': case 'bestemmie':
        if (adminCheck) { adminGuard(); break; }
        setChat('bestemmiometro'); break;

      case 'antispam':
        if (adminCheck) { adminGuard(); break; }
        setChat('antispam'); break;

      case 'antiporn': case 'antiporno': case 'antinsfw':
        if (adminCheck) { adminGuard(); break; }
        setChat('antiporno'); break;

      case 'antigore':
        if (adminCheck) { adminGuard(); break; }
        setChat('antigore'); break;

      case 'ia': case 'ai':
        if (!m.isGroup && !isOwner) { groupGuard(); break; }
        if (m.isGroup && !isAdmin && !isOwner && !isROwner) { adminGuard(); break; }
        setChat('ai'); break;

      case 'vocali': case 'siri':
        if (!m.isGroup && !isOwner) { groupGuard(); break; }
        if (m.isGroup && !isAdmin && !isOwner && !isROwner) { adminGuard(); break; }
        setChat('vocali'); break;

      case 'subbots':
        if (ownerOnly) { ownerGuard(); break; }
        setBot('jadibotmd'); break;

      case 'detect': case 'rileva':
        if (!m.isGroup && !isOwner) { groupGuard(); break; }
        if (m.isGroup && !isAdmin && !isOwner && !isROwner) { adminGuard(); break; }
        setChat('rileva'); break;

      case 'antilink': case 'nolink':
        if (adminCheck) { adminGuard(); break; }
        setChat('antiLink'); break;

      default:
        result.status = '𝐂𝐨𝐦𝐚𝐧𝐝𝐨 𝐧𝐨𝐧 𝐫𝐢𝐜𝐨𝐧𝐨𝐬𝐜𝐢𝐮𝐭𝐨'; break;
    }
    return result;
  };

  // ─── MENU ────────────────────────────────────────────────────
  if (!args.length) {
    const createSections = (features) => [
      { title: 'Attiva', rows: features.map(f => ({ title: f.name, description: f.desc, id: `${usedPrefix}attiva ${f.key}` })) },
      { title: 'Disattiva', rows: features.map(f => ({ title: f.name, description: f.desc, id: `${usedPrefix}disattiva ${f.key}` })) }
    ];

    const bot333 = 'media/menu/333.jpeg';
    let cards = [
      {
        image: { url: bot333 },
        title: 'Impostazioni Admin',
        body: 'Gestisci le funzioni del gruppo selezionando attiva o disattiva.',
        footer: '333 bot',
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Impostazioni gruppo', sections: createSections(adminFeatures) }) }]
      }
    ];

    if (isOwner || isROwner) {
      cards.push({
        image: { url: bot333 },
        title: 'Impostazioni Owner',
        body: 'Gestisci le funzioni proprietario selezionando attiva o disattiva.',
        footer: '333 bot',
        buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Seleziona azione', sections: createSections(ownerFeatures) }) }]
      });
    }

    return conn.sendMessage(m.chat, {
      text: '*Sistema di gestione funzioni*',
      footer: '333 bot',
      cards,
      contextInfo: dynamicContextInfo
    }, { quoted: m });
  }

  // ─── CATALOGO ────────────────────────────────────────────────
  const firstArg = args[0].toLowerCase();
  if (catalogs[firstArg]) {
    if (m.isGroup && !(isAdmin || isOwner || isROwner)) {
      return conn.sendMessage(m.chat, { text: '𝐂𝐨𝐦𝐚𝐧𝐝𝐨 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐞 𝐬𝐨𝐥𝐨 𝐩𝐞𝐫 𝐚𝐝𝐦𝐢𝐧', contextInfo: dynamicContextInfo }, { quoted: m });
    }
    const results = catalogs[firstArg].map(key => toggleFeature(key));
    let msg = `╭─────────╮\n┃𝐂𝐀𝐓𝐀𝐋𝐎𝐆𝐎 *${firstArg.toUpperCase()}* ${isEnable ? '𝐀𝐓𝐓𝐈𝐕𝐀𝐓𝐎' : '𝐃𝐈𝐒𝐀𝐓𝐓𝐈𝐕𝐀𝐓𝐎'}\n┃━━━━━━━━━━━\n`;
    results.forEach(r => { msg += `┃ *${r.type}* ${r.status}\n`; });
    msg += `┃━━━━━━━━━━━\n┃𝟑𝟑𝟑 𝐁𝐎𝐓\n╰─────────╯`;
    return conn.sendMessage(m.chat, { text: msg, contextInfo: dynamicContextInfo }, { quoted: m });
  }

  // ─── TOGGLE SINGOLO / MULTIPLO ───────────────────────────────
  const results = args.map(arg => toggleFeature(arg.toLowerCase()));
  let summaryMessage = `╭─────────╮\n┃𝐒𝐓𝐀𝐓𝐎 𝐌𝐎𝐃𝐈𝐅𝐈𝐂𝐇𝐄:\n┃━━━━━━━━━━━\n`;
  results.forEach(r => { summaryMessage += `┃ *${r.type}* ${r.status}\n┃━━━━━━━━━━━\n`; });
  summaryMessage += `┃𝟑𝟑𝟑 𝐁𝐎𝐓\n╰─────────╯`;

  await conn.sendMessage(m.chat, { text: summaryMessage, contextInfo: dynamicContextInfo }, { quoted: m });
};

handler.help = ['attiva', 'disabilita'];
handler.tags = ['main'];
handler.command = ['enable', 'disable', 'attiva', 'disabilita', 'on', 'off'];

export default handler;