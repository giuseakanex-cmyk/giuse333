import { watchFile } from 'fs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = fileURLToPath(import.meta.url)
const PROTECTED_FOLDER_PATH = path.join(__dirname, '..', '.protected_plugins')
const PROTECTED_PLUGIN_FILE = path.join(PROTECTED_FOLDER_PATH, 'crediti.js')
const PROTECTED_PLUGIN_PATH = path.join(__dirname, '..', 'plugins', 'crediti.js')
const PROTECTED_PLUGIN_HASH = '50c20ba36331429abffe758db08d5326d9a397862fcde4494046c0fcffbdb9fb'

function normalizePrintSource(source) {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n+$/u, '')
}

function computePrintNormalizedHash(buffer) {
  return crypto.createHash('sha256').update(normalizePrintSource(buffer.toString('utf8')), 'utf8').digest('hex')
}

function verifyPrintProtectedPluginStorage() {
  if (!fs.existsSync(PROTECTED_FOLDER_PATH) || !fs.existsSync(PROTECTED_PLUGIN_FILE)) {
    console.error(`[protezione plugin] Cartella protetta o plugin nascosto mancante. Arresto del bot.`)
    process.exit(1)
  }
  if (!fs.existsSync(PROTECTED_PLUGIN_PATH)) {
    console.error(`[protezione plugin] Plugin protetto mancante. Arresto del bot.`)
    process.exit(1)
  }
  const hiddenHash = computePrintNormalizedHash(fs.readFileSync(PROTECTED_PLUGIN_FILE))
  const actualHash = computePrintNormalizedHash(fs.readFileSync(PROTECTED_PLUGIN_PATH))
  if (hiddenHash !== PROTECTED_PLUGIN_HASH || actualHash !== PROTECTED_PLUGIN_HASH) {
    console.error(`[protezione plugin] Firma non valida per plugin protetto 'crediti.js'. Arresto del bot.`)
    process.exit(1)
  }
}
// Eseguito una sola volta all'avvio (non rallenta i messaggi)
verifyPrintProtectedPluginStorage()

const nameCache = global.nameCache || (global.nameCache = new NodeCache({ stdTTL: 600, useClones: false }));
const groupMetaCache = global.groupCache || (global.groupCache = new NodeCache({ stdTTL: 300, useClones: false }));
const phoneCache = new Map(); // Velocizza la formattazione dei numeri
const errorThrottle = new Map();
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
const lastLogCache = { jid: null, time: 0 };

export function ensureMessageUpdateListener(conn = { ev: null, user: {} }) {
  if (!conn?.ev || global.messageUpdateListenerSet) return
  conn.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const key = update?.key
      if (!key?.remoteJid || !key?.id) continue
      if (update.update?.message?.editedMessage?.message) {
        try {
          const editedContainer = update.update.message.editedMessage
          let editedMessage = editedContainer?.message || editedContainer
          if (editedMessage?.message) editedMessage = editedMessage.message
          if (!editedMessage) continue

          let originalMsg = null
          if (global.store?.getMessage) {
            originalMsg = await global.store.getMessage(key)
          }

          const participant = key.participant || originalMsg?.key?.participant || key.remoteJid
          const fakeMsg = {
            key: { ...key, participant, fromMe: false },
            message: editedMessage,
            messageTimestamp: originalMsg?.messageTimestamp || update.update?.timestamp,
            pushName: originalMsg?.pushName,
            broadcast: originalMsg?.broadcast,
          }

          if (typeof conn.handler === 'function') {
            conn.handler({ messages: [fakeMsg], type: 'notify' })
          }
        } catch {}
      }
    }
  })
  global.messageUpdateListenerSet = true
}

export default function (m, conn = { user: {} }) {
  ensureMessageUpdateListener(conn)

  const protocolType = m?.message?.protocolMessage?.type
  const hasEditedMessage = !!(m?.message?.editedMessage || m?.message?.protocolMessage?.editedMessage)
  if (hasEditedMessage || protocolType === 'MESSAGE_EDIT' || protocolType === 14 || m?.messageStubType === 68 || protocolType === 'REVOKE' || protocolType === 0) return
  if (!m || m.key?.fromMe) return

  const now = Date.now();
  const senderJid = m.sender;
  if (lastLogCache.jid === senderJid && now - lastLogCache.time < 500) return;
  lastLogCache.jid = senderJid;
  lastLogCache.time = now;

  // Esecuzione sincrona non bloccante
  try {
    const chatJid = m.chat || '';
    if (!chatJid) return;

    const botJid = conn.user?.jid;

    // Recupero dati sincrono da Cache o Store locale (Zero attese di rete)
    const getNameSync = (jid) => {
      let cached = nameCache.get(jid);
      if (cached) return cached;

      if (jid.endsWith('@newsletter')) return 'Newsletter ' + jid.split('@')[0];
      if (jid.endsWith('@g.us')) {
        return groupMetaCache.get(jid)?.subject || 'Gruppo';
      }

      const c = conn.contacts?.[jid] || global.store?.contacts?.[jid];
      let res = c?.notify || c?.name || '';
      
      if (!res && jid === senderJid && m.pushName) res = m.pushName;
      if (!res) {
        // Chiamata asincrona in background per i prossimi messaggi
        conn.getName(jid).then(name => { if (name) nameCache.set(jid, name) }).catch(() => {});
        return jid.split('@')[0];
      }
      
      nameCache.set(jid, res);
      return res;
    };

    const _name = getNameSync(senderJid);
    const sender = formatPhoneNumber(senderJid, _name);
    const chat = getNameSync(chatJid);
    const me = formatPhoneNumber(botJid || '', conn.user?.name || 'Bot');

    const senderPhone = senderJid.split('@')[0];
    const isOwner = Array.isArray(global.owner) ? global.owner.some(([num]) => num === senderPhone) : global.owner === senderPhone;
    const isGroup = chatJid.endsWith('@g.us');
    
    // Gestione Admin Sincrona
    let isAdmin = false;
    let participantCount = '?';
    if (isGroup) {
      let groupMeta = groupMetaCache.get(chatJid);
      if (!groupMeta) {
        // Recupero asincrono in background per evitare lag
        conn.groupMetadata(chatJid).then(meta => { if (meta) groupMetaCache.set(chatJid, meta) }).catch(() => {});
      } else {
        participantCount = groupMeta.participants?.length || '?';
        isAdmin = groupMeta.participants?.some(p => (p.id === senderJid || p.jid === senderJid) && (p.admin === 'admin' || p.admin === 'superadmin')) || false;
      }
    }

    const isPremium = global.prems?.includes(senderJid) || false;
    const isBanned = global.DATABASE?.data?.users?.[senderJid]?.banned || false;
    
    const filesize = getFileSize(m)
    const ts = formatTimestamp(m.messageTimestamp)
    const messageAge = getMessageAge(m.messageTimestamp)
    const c = getColorScheme()
    const bordi = getBorders(c)
    const tipo = formatType(m)

    const righe = [
      `\x1b[38;5;196m╔════════════〔333 BOT〕═══════════╗\x1b[0m`,
      `\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mBOT\x1b[0m ⇢ \x1b[37m${me}\x1b[0m`,
      `\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mORARIO\x1b[0m ⇢ \x1b[37m${ts}\x1b[0m${messageAge ? ` \x1b[90m⟨${messageAge}⟩\x1b[0m` : ''}`,
      `\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mUTENTE\x1b[0m ⇢ \x1b[37m${sender}\x1b[0m${isGroup ? ` \x1b[90m⟡ ${getUserStatus(isOwner, isAdmin, isPremium, isBanned, c)}\x1b[0m` : ''}`,
      `\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mCHAT\x1b[0m ⇢ \x1b[37m${chat}\x1b[0m${isGroup ? ' \x1b[90m⦿ GRUPPO\x1b[0m' : ' \x1b[90m◉ PRIVATO\x1b[0m'}`,
      `\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mTIPO\x1b[0m ⇢ \x1b[37m${tipo}\x1b[0m${getMessageFlags(m, c)}`
    ]

    if (filesize) righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mDIMENSIONE\x1b[0m ⇢ \x1b[37m${formatSize(filesize)}\x1b[0m`);
    const commandText = getCommandText(m)
    if (commandText) righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mCMD\x1b[0m ⇢ \x1b[37m${commandText}\x1b[0m`);
    if (isGroup) righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mMEMBRI\x1b[0m ⇢ \x1b[37m${participantCount}\x1b[0m`);

    if (m.quoted) {
      const quotedSenderJid = m.quoted.sender;
      const qname = nameCache.get(quotedSenderJid) || quotedSenderJid.split('@')[0];
      righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mRisposta a\x1b[0m ⇢ \x1b[37m${qname}\x1b[0m ${c.secondary('(')}${c.meta(formatType(m.quoted))}${c.secondary(')')}`)
    }

    if (m.forwarded) righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mInoltrato\x1b[0m ⇢ \x1b[37mSì\x1b[0m`)
    if (m.broadcast) righe.push(`\x1b[38;5;196m║\x1b[0m \x1b[38;5;46mBroadcast\x1b[0m ⇢ \x1b[37mSì\x1b[0m`)

    righe.push(`${bordi.bottom}`)
    console.log('\n' + righe.join('\n'))

    // Formattazione del testo sincrona
    formatTextSync(m, c, getNameSync);

  } catch (error) {
    throttleError('Errore in print.js:', error.message, 5000);
  }
}

function formatPhoneNumber(jid, name) {
    if (!jid) return 'Sconosciuto';
    if (jid.endsWith('@newsletter')) return `Newsletter: ${jid.split('@')[0]}${name ? ` ~${name}` : ''}`;
    
    let userPart = jid.split('@')[0].split(':')[0];
    if (phoneCache.has(userPart)) return phoneCache.get(userPart) + (name ? ` ~${name}` : '');

    try {
        const number = PhoneNumber('+' + userPart).getNumber('international');
        phoneCache.set(userPart, number);
        return number + (name ? ` ~${name}` : '');
    } catch {
        return userPart + (name ? ` ~${name}` : '');
    }
}

function getFileSize(m) {
  return m.msg?.fileLength || m.msg?.fileSha256?.length || m.text?.length || m.caption?.length || 0
}

function formatTimestamp(timestamp) {
  const date = timestamp ? new Date(timestamp * 1000) : new Date()
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getMessageAge(timestamp) {
  if (!timestamp) return ''
  const sec = (Date.now() / 1000) - timestamp
  if (sec < 60) return `${Math.floor(sec)}s fa`
  if (sec < 3600) return `${Math.floor(sec / 60)}m fa`
  return ''
}

function getColorScheme() {
  const violet = color => chalk.hex(color)
  return {
    label: violet('#6349d8ff').bold,
    text: violet('#ffffffff'),
    secondary: violet('#6944ceff'),
    meta: violet('#5f40ceff'),
    bright: violet('#7247e7ff'),
    success: violet('#a298fbff'),
    warning: violet('#FFB6C1'),
    error: violet('#FF6347'),
  }
}

function getBorders(c) {
  return { bottom: `\x1b[38;5;196m╚═══════════════════════════════════╝\x1b[0m` }
}

function formatType(m) {
  return (m.mtype || 'unknown').replace(/Message/gi, '')
}

function getUserStatus(isOwner, isAdmin, isPremium, isBanned, c) {
  if (isOwner) return c.success('👑 OWNER')
  if (isAdmin) return c.warning('ADMIN')
  if (isBanned) return c.error('🚫 BANNATO')
  return 'User'
}

function getMessageFlags(m, c) {
  let flags = []
  if (m.isCommand) flags.push(c.label('COMANDO:'))
  if (m.quoted) flags.push(c.meta('RISPOSTA'))
  return flags.length ? ` ${c.secondary('•')} ${flags.join(' ')}` : ''
}

function getCommandText(m) {
  const text = (m.text || m.caption || '').trim()
  if (!text) return ''
  if (/^[.!\/#$%\&*+=\?@\-]/.test(text)) return text.split(' ')[0].slice(1);
  return ''
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i]
}

function throttleError(message, error, delay) {
  const key = message + error;
  const now = Date.now();
  if (!errorThrottle.has(key) || now - errorThrottle.get(key) > delay) {
    console.error(chalk.red(message), error);
    errorThrottle.set(key, now);
  }
}

function formatTextSync(m, c, getNameSync) {
  if (!m.text && !m.caption) return;
  let text = (m.text || m.caption || '').replace(/\u200e+/g, '').trim();
  if (!text) return;

  const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(.+?)\1|
http://googleusercontent.com/immersive_entry_chip/
