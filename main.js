import './settings.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import process from 'process';
import readline from 'readline';
import chalk from 'chalk';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  useMultiFileAuthState
} from '@chatunity/baileys';
import {
  botIsGroupAdmin,
  ensureDb,
  isOwner,
  mentionLabel,
  readDb,
  resolveParticipantJid,
  userKey,
  writeDb
} from './lib/permissions.js';
import { canExecuteCommand } from './lib/soloadmin.js';
import { startWebServer } from './lib/webserver.js';
import {
  logError,
  logPacket,
  logPluginLoad,
  logStatus,
  showBootAnimation
} from './lib/terminal.js';
import { BetChecker } from './lib/betChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.join(__dirname, 'session');
const pluginsDir = path.join(__dirname, 'plugins');
const databasePath = path.join(__dirname, 'database.json');

const groupIntroGifPath = path.join(__dirname, 'assets', '142453.gif');
const welcomeVideoPath = path.join(__dirname, 'assets', 'benvenuto.mp4');
const byeVideoPath = path.join(__dirname, 'assets', 'byebye.mp4');

global.zushiEvents = new EventEmitter();

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  create(sessionId, data, ttlMs = 60000, onExpire = null) {
    if (this.sessions.has(sessionId)) {
      this.delete(sessionId);
    }

    const timer = setTimeout(() => {
      if (typeof onExpire === 'function') {
        try { onExpire(this.sessions.get(sessionId)?.data); } catch (e) { logError('session expire', e); }
      }
      this.sessions.delete(sessionId);
      global.zushiEvents.emit('session:expired', { sessionId, data });
    }, ttlMs);

    this.sessions.set(sessionId, { data, timer, createdAt: Date.now() });
    return data;
  }

  get(sessionId) {
    return this.sessions.get(sessionId)?.data || null;
  }

  has(sessionId) {
    return this.sessions.has(sessionId);
  }

  delete(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearTimeout(session.timer);
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }
}

global.zushiSessions = new SessionStore();

const mediaBufferCache = new Map();
function getCachedMedia(filePath) {
  if (!filePath) return null;
  if (mediaBufferCache.has(filePath)) return mediaBufferCache.get(filePath);
  try {
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      mediaBufferCache.set(filePath, buf);
      return buf;
    }
  } catch {}
  return null;
}

const logger = pino({ level: process.env.ZUSHI_LOG_LEVEL || 'silent' });
const botName = global.botName || 'Zushi';
const owner = global.owner || [];
let loginMode = process.argv.includes('code') ? 'code' : process.argv.includes('qr') ? 'qr' : '';
global.zushiOnlineUsers ||= new Map();
global.zushiIsOffline ||= false;
global.betChecker = null;

const groupMetadataCache = new Map();
const METADATA_TTL = 5 * 60 * 1000;

let dbCache = null;
let lastDbRead = 0;
function getCachedDb() {
  const now = Date.now();
  if (!dbCache || now - lastDbRead > 3000) {
    dbCache = readDb();
    lastDbRead = now;
  }
  return dbCache;
}

fs.mkdirSync(sessionDir, { recursive: true });
fs.mkdirSync(pluginsDir, { recursive: true });
await showBootAnimation(botName);

startWebServer({
  port: global.webPort,
  baseUrl: global.webBaseUrl,
  dbPath: databasePath
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const plugins = new Map();
global.plugins = plugins;
const msgRetryCounterCache = new Map();
let sock = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let starting = false;
let pairingRequested = false;

function getPrefixes() {
  const p = global.prefix;
  if (Array.isArray(p)) return p;
  return [p || '.'];
}

function getGroupSettings(jid) {
  try {
    const file = path.join(__dirname, 'db', 'sicurezza_settings.json');
    if (!fs.existsSync(file)) return { benvenuto: true, leggi: false };
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data[jid] || { benvenuto: true, leggi: false };
  } catch {
    return { benvenuto: true, leggi: false };
  }
}

async function chooseLoginModeIfNeeded(creds) {
  if (creds?.registered || loginMode) return;
  if (creds?.me?.id) {
    logStatus('session', 'sessione esistente rilevata, ripristino senza nuovo login', 'ok');
    return;
  }

  console.log(chalk.hex('#00FF9C').bold(`\n${botName} - metodo di collegamento`));
  console.log(chalk.white('1. QR code'));
  console.log(chalk.white('2. Codice di abbinamento'));

  const answer = (await question(chalk.cyan('Scegli metodo [1/2]: '))).trim();
  loginMode = answer === '2' ? 'code' : 'qr';
}

async function loadPlugins() {
  plugins.clear();
  const files = fs.readdirSync(pluginsDir).filter((file) => file.endsWith('.js'));
  const loaded = [];

  for (const file of files) {
    try {
      const url = pathToFileURL(path.join(pluginsDir, file)).href + `?update=${Date.now()}`;
      const mod = await import(url);
      const plugin = mod.default || mod;
      const names = [plugin.name, ...(plugin.aliases || [])].filter(Boolean);

      for (const name of names) {
        plugins.set(String(name).toLowerCase(), { ...plugin, file });
      }

      loaded.push(file.replace(/\.js$/, ''));
    } catch (error) {
      logError(`plugin ${file}`, error);
    }
  }

  logPluginLoad(loaded);
}

global.reloadPlugins = loadPlugins;

function uniquePlugins() {
  const seen = new Set();
  const list = [];
  for (const plugin of plugins.values()) {
    const key = `${plugin.file}:${plugin.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(plugin);
  }
  return list;
}

function markOnlineUser(chatJid, participantJid) {
  if (!chatJid?.endsWith('@g.us') || !participantJid) return;
  const chatUsers = global.zushiOnlineUsers.get(chatJid) || new Map();
  const now = Date.now();
  chatUsers.set(normalizeJid(participantJid), now);

  if (chatUsers.size > 500) {
    for (const [user, time] of chatUsers.entries()) {
      if (now - time > 86400000) chatUsers.delete(user);
    }
  }

  global.zushiOnlineUsers.set(chatJid, chatUsers);
}

function handlePresenceUpdate(update = {}) {
  const chatJid = update.id;
  if (!chatJid?.endsWith('@g.us')) return;

  for (const [participant, presence] of Object.entries(update.presences || {})) {
    const state = presence?.lastKnownPresence || presence?.lastSeen || '';
    if (['available', 'composing', 'recording'].includes(state)) {
      markOnlineUser(chatJid, participant);
    }
  }
}

async function handleIncomingCall(callEvents = []) {
  for (const call of callEvents) {
    if (call.status === 'offer') {
      try {
        await sock.rejectCall(call.id, call.from);
        logStatus('anti-call', `Chiamata rifiutata da: ${call.from}`, 'warn');
        await sock.sendMessage(call.from, {
          text: '⚠️ *Chiamate non consentite:* Il bot rifiuta automaticamente tutte le chiamate vocali e video.'
        });
      } catch (err) {
        logError('anti-call error', err);
      }
    }
  }
}

function normalizeJid(jid = '') {
  return jid.split(':')[0] + (jid.includes('@') ? '@' + jid.split('@')[1] : '');
}

function getText(message = {}) {
  return message.conversation
    || message.extendedTextMessage?.text
    || message.imageMessage?.caption
    || message.videoMessage?.caption
    || message.buttonsResponseMessage?.selectedButtonId
    || message.templateButtonReplyMessage?.selectedId
    || message.listResponseMessage?.singleSelectReply?.selectedRowId
    || '';
}

function getMessageType(message = {}) {
  const [type] = Object.keys(message || {});
  if (!type) return 'unknown';
  return type.replace('Message', '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function formatPhoneNumber(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return value || '-';

  if (digits.startsWith('39') && digits.length >= 11) {
    const country = digits.slice(0, 2);
    const rest = digits.slice(2);
    const first = rest.slice(0, 3);
    const middle = rest.slice(3, 6);
    const last = rest.slice(6);
    return `+${country} ${first} ${middle} ${last}`.trim();
  }

  if (digits.length > 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`;
  }

  return `+${digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`;
}

async function logIncomingMessage(sock, msg, text, command = null) {
  const chat = msg.key.remoteJid || '';
  const isGroup = chat.endsWith('@g.us');
  const sender = normalizeJid(msg.key.participant || chat);
  const nickname = msg.pushName || 'Senza nome';
  const messageType = getMessageType(msg.message);
  const preview = text ? text.replace(/\s+/g, ' ').slice(0, 120) : `[${messageType}]`;
  const time = new Date().toLocaleTimeString('it-IT', { hour12: false });
  const isCommand = Boolean(command);
  let chatName = 'Chat privata';

  if (isGroup) {
    try {
      const metadata = await safeGroupMetadata(sock, chat);
      chatName = metadata?.subject || 'Gruppo senza nome';
    } catch {
      chatName = 'Gruppo';
    }
  }

  const number = formatPhoneNumber(sender.replace(/@s\.whatsapp\.net|@lid/g, ''));
  const scope = isGroup ? 'GROUP' : 'PRIVATE';

  logPacket({
    command,
    scope,
    time,
    chatName,
    nickname,
    number,
    messageType,
    preview: isCommand ? preview.replace(/^\S+\s*/, '') || '-' : preview
  });
}

function queueIncomingLog(sock, msg, text, command = null) {
  const timer = setTimeout(() => {
    logIncomingMessage(sock, msg, text, command)
      .catch((error) => logError('packet log', error));
  }, 10);
  timer.unref?.();
}

function queueEveryMessageHooks(context) {
  const timer = setTimeout(async () => {
    const activeHooks = uniquePlugins().filter(p => typeof p.onEveryMessage === 'function');
    await Promise.allSettled(activeHooks.map(plugin =>
      plugin.onEveryMessage(context).catch(error => logError(`hook ${plugin.name || plugin.file}`, error))
    ));
  }, 0);
  timer.unref?.();
}

async function sendText(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}

function isMutedInGroup(jid, sender) {
  if (!jid?.endsWith('@g.us')) return false;
  const db = getCachedDb();
  ensureDb(db);
  const muted = db.mutedGroups?.[jid] || [];
  return muted.includes(userKey(sender));
}

async function deleteMutedMessage(sock, msg) {
  try {
    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
  } catch (error) {
    logError('delete muted', error);
  }
}

async function handleMessage(sock, upsert) {
  if (upsert.type !== 'notify') return;

  for (const msg of upsert.messages || []) {
    try {
      if (!msg.message || msg.key?.remoteJid === 'status@broadcast') continue;

      const from = msg.key.remoteJid;
      const sender = normalizeJid(msg.key.participant || msg.key.remoteJid || '');

      const text = getText(msg.message).trim();
      const prefixes = getPrefixes();
      const usedPrefix = prefixes.find((p) => text.startsWith(p));
      const isCommandText = Boolean(usedPrefix);
      const [rawCommand, ...args] = isCommandText ? text.slice(usedPrefix.length).trim().split(/\s+/) : [];
      const command = rawCommand?.toLowerCase();

      if (global.zushiIsOffline) {
        const isWakeUp = command === 'ntevedo' && isOwner(sender);
        if (!isWakeUp) continue;
      }

      markOnlineUser(from, sender);
      if (isMutedInGroup(from, sender)) {
        await deleteMutedMessage(sock, msg);
        continue;
      }

      const activePrefix = usedPrefix || prefixes[0];

      const baseContext = {
        sock,
        msg,
        from,
        sender,
        text,
        prefix: activePrefix,
        botName,
        isCommand: isCommandText,
        command,
        sendText: (body) => sendText(sock, from, body, msg)
      };
      queueEveryMessageHooks(baseContext);

      if (!isCommandText) {
        for (const plugin of uniquePlugins()) {
          if (typeof plugin.onMessage !== 'function') continue;
          const handled = await plugin.onMessage({ ...baseContext });
          if (handled) break;
        }
        queueIncomingLog(sock, msg, text, null);
        continue;
      }

      if (!text || !isCommandText || !command) {
        queueIncomingLog(sock, msg, text, null);
        continue;
      }

      const allowed = await canExecuteCommand(sock, from, sender);
      if (!allowed) {
        await sock.sendMessage(from, { react: { text: '🚫', key: msg.key } });
        queueIncomingLog(sock, msg, text, command);
        return sendText(sock, from, '🔒 In questo gruppo la modalità *Solo Admin* è attiva.', msg);
      }

      if (command === 'reload') {
        if (!owner.includes(sender.replace(/\D/g, ''))) return sendText(sock, from, 'Comando riservato al proprietario.', msg);
        await loadPlugins();
        const result = await sendText(sock, from, 'Plugin ricaricati.', msg);
        queueIncomingLog(sock, msg, text, command);
        return result;
      }

      const plugin = plugins.get(command);
      if (!plugin) {
        queueIncomingLog(sock, msg, text, command);
        return;
      }

      await plugin.run({
        ...baseContext,
        args,
        command
      });
      queueIncomingLog(sock, msg, text, command);
    } catch (error) {
      logError('message handler', error);
    }
  }
}

async function handleGroupParticipantsUpdate(sock, update = {}) {
  try {
    if (global.zushiIsOffline) return;

    const jid = update.id;
    const participants = update.participants || [];
    if (!jid?.endsWith('@g.us') || !participants.length) return;

    groupMetadataCache.delete(jid);
    const settings = getGroupSettings(jid);

    if (update.action === 'promote') {
      if (participants.some((participant) => isBotJid(sock, participant))) {
        return sendBotPromotedNotice(sock, jid);
      }
      if (settings.leggi) {
        const mentions = participants.map((p) => `@${mentionLabel(p)}`).join(' ');
        return sock.sendMessage(jid, {
          text: `💬 ${mentions} ${participants.length === 1 ? 'è stato promosso ad amministratore.' : 'sono stati promossi ad amministratori.'}`,
          mentions: participants
        });
      }
    }

    if (update.action === 'demote' && settings.leggi) {
      const mentions = participants.map((p) => `@${mentionLabel(p)}`).join(' ');
      return sock.sendMessage(jid, {
        text: `💬 ${mentions} ${participants.length === 1 ? 'è stato rimosso dagli amministratori.' : 'sono stati rimossi dagli amministratori.'}`,
        mentions: participants
      });
    }

    if (update.action === 'remove') {
      if (settings.benvenuto !== false) {
        if (!await botIsGroupAdmin(sock, jid)) return;
        return sendGroupGoodbye(sock, jid, participants);
      } else if (settings.leggi) {
        const mentions = participants.map((p) => `@${mentionLabel(p)}`).join(' ');
        return sock.sendMessage(jid, {
          text: `💬 ${mentions} ${participants.length === 1 ? 'ha lasciato o è stato rimosso dal gruppo.' : 'hanno lasciato o sono stati rimossi dal gruppo.'}`,
          mentions: participants
        });
      }
    }

    if (update.action === 'add') {
      if (participants.some((participant) => isBotJid(sock, participant))) {
        await markIntroSent(jid);
        return sendGroupIntro(sock, jid);
      }

      if (settings.benvenuto !== false) {
        if (!await botIsGroupAdmin(sock, jid)) return;
        return sendGroupWelcome(sock, jid, participants);
      }
    }
  } catch (error) {
    logError('group participants', error);
  }
}

async function handleGroupsUpdate(sock, updates = []) {
  try {
    if (global.zushiIsOffline) return;

    const list = Array.isArray(updates) ? updates : [updates];
    for (const update of list) {
      const jid = update?.id;
      if (!jid?.endsWith('@g.us')) continue;
      groupMetadataCache.delete(jid);
      if (isKnownGroup(jid)) continue;
      await markKnownGroup(jid);
      await markIntroSent(jid);
      await sendGroupIntro(sock, jid);
    }
  } catch (error) {
    logError('groups update', error);
  }
}

async function initializeKnownGroups(sock) {
  try {
    if (typeof sock.groupFetchAllParticipating !== 'function') return;
    const groups = await sock.groupFetchAllParticipating();
    const ids = Object.keys(groups || {}).filter((jid) => jid.endsWith('@g.us'));
    if (!ids.length) return;

    const db = readDb();
    ensureGroupIntroDb(db);
    let changed = false;
    for (const jid of ids) {
      if (!db.groupIntros.known[jid]) {
        db.groupIntros.known[jid] = Date.now();
        changed = true;
      }
    }
    if (changed) writeDb(db);
  } catch (error) {
    logError('group sync', error);
  }
}

function ensureGroupIntroDb(db) {
  ensureDb(db);
  db.groupIntros ||= {};
  db.groupIntros.known ||= {};
  db.groupIntros.sent ||= {};
}

function isKnownGroup(jid) {
  const db = readDb();
  ensureGroupIntroDb(db);
  return Boolean(db.groupIntros.known[jid]);
}

async function markKnownGroup(jid) {
  const db = readDb();
  ensureGroupIntroDb(db);
  db.groupIntros.known[jid] ||= Date.now();
  writeDb(db);
}

async function markIntroSent(jid) {
  const db = readDb();
  ensureGroupIntroDb(db);
  db.groupIntros.known[jid] ||= Date.now();
  db.groupIntros.sent[jid] = Date.now();
  writeDb(db);
}

async function sendBotPromotedNotice(sock, jid) {
  const metadata = await safeGroupMetadata(sock, jid);
  const groupName = metadata?.subject || 'questo gruppo';
  const mainPrefix = getPrefixes()[0];

  const text = [
    '👑 *Promozione Amministratore*',
    '',
    `✦ Sono stato promosso amministratore in *${groupName}*!`,
    `✦ Usa *${mainPrefix}cmd* per vedere i comandi disponibili.`
  ].join('\n');

  return sock.sendMessage(jid, { text });
}

async function sendGroupIntro(sock, jid) {
  const metadata = await safeGroupMetadata(sock, jid);
  const groupName = metadata?.subject || 'questo gruppo';
  const mainPrefix = getPrefixes()[0];

  const caption = [
    `⚡ *${botName} è entrato nel gruppo*`,
    '',
    `✦ Ciao! Sono *${botName}*.`,
    `✦ Sono pronto a gestire comandi, giochi e moderazione in *${groupName}*.`,
    '',
    `✦ Scrivi *${mainPrefix}cmd* per iniziare.`
  ].join('\n');

  try {
    const gif = getCachedMedia(groupIntroGifPath);
    if (!gif) throw new Error('GIF intro mancante');
    return await sock.sendMessage(jid, {
      video: gif,
      gifPlayback: true,
      caption
    });
  } catch (error) {
    logError('group intro gif', error);
    return sock.sendMessage(jid, { text: caption });
  }
}

async function sendGroupWelcome(sock, jid, participants = []) {
  const metadata = await safeGroupMetadata(sock, jid);
  const groupName = metadata?.subject || 'questo gruppo';
  const participantsCount = metadata?.participants?.length || '?';
  const resolved = [];

  for (const participant of participants) {
    const target = await resolveParticipantJid(sock, jid, [participant]);
    if (target && !isBotJid(sock, target) && !resolved.includes(target)) resolved.push(target);
  }

  if (!resolved.length) return;

  const mentions = resolved.map((participant) => `@${mentionLabel(participant)}`).join(' ');
  const text = [
    `✦ Ciao ${mentions}!`,
    '',
    `✦ ${resolved.length === 1 ? 'Benvenuto' : 'Benvenuti'} in`,
    `> *${groupName}*!`,
    '',
    `> Membri: *${participantsCount}*.`,
    '',
    '✦ Leggi le regole del gruppo e divertiti! 🗣️'
  ].join('\n');

  try {
    const video = getCachedMedia(welcomeVideoPath) || getCachedMedia(groupIntroGifPath);
    if (!video) throw new Error('Video di benvenuto mancante');

    return await sock.sendMessage(jid, {
      video: video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      caption: text,
      mentions: resolved
    });
  } catch (error) {
    logError('group welcome video', error);
    return sock.sendMessage(jid, {
      text,
      mentions: resolved
    });
  }
}

async function sendGroupGoodbye(sock, jid, participants = []) {
  const metadata = await safeGroupMetadata(sock, jid);
  const groupName = metadata?.subject || 'questo gruppo';
  const participantsCount = metadata?.participants?.length || '?';
  const resolved = [];

  for (const participant of participants) {
    const target = await resolveParticipantJid(sock, jid, [participant]);
    if (target && !isBotJid(sock, target) && !resolved.includes(target)) resolved.push(target);
  }

  if (!resolved.length) return;

  const mentions = resolved.map((participant) => `@${mentionLabel(participant)}`).join(' ');
  const text = [
    `✦ Addio ${mentions}!`,
    '',
    `✦ ${resolved.length === 1 ? 'Ha' : 'Hanno'} appena lasciato`,
    `> *${groupName}*!`,
    '',
    `> Membri rimasti: *${participantsCount}*.`,
    '',
    '✦ Ci mancherai! 🚶‍♂️💨'
  ].join('\n');

  try {
    const video = getCachedMedia(byeVideoPath);
    if (!video) throw new Error('Video di addio mancante');

    return await sock.sendMessage(jid, {
      video: video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      caption: text,
      mentions: resolved
    });
  } catch (error) {
    logError('group goodbye video', error);
    return sock.sendMessage(jid, {
      text,
      mentions: resolved
    });
  }
}

async function safeGroupMetadata(sock, jid) {
  if (!jid?.endsWith('@g.us')) return null;
  const cached = groupMetadataCache.get(jid);
  if (cached && (Date.now() - cached.time < METADATA_TTL)) {
    return cached.data;
  }
  try {
    const data = await sock.groupMetadata(jid);
    groupMetadataCache.set(jid, { data, time: Date.now() });
    return data;
  } catch {
    return null;
  }
}

function isBotJid(sock, jid = '') {
  const target = userKey(jid);
  if (!target) return false;
  return [
    sock.user?.id,
    sock.user?.lid,
    sock.authState?.creds?.me?.id,
    sock.authState?.creds?.me?.lid
  ].some((value) => userKey(value) === target);
}

async function start() {
  if (starting) return;
  starting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    await chooseLoginModeIfNeeded(state.creds);

    let pairingNumber = global.botNumberCode || '';
    const needsPairing = loginMode === 'code' && !state.creds.registered && !state.creds.me?.id && !pairingRequested;

    if (needsPairing && !pairingNumber) {
      pairingNumber = await question(chalk.cyan('Numero WhatsApp con prefisso internazionale (es. +393471234567): '));
    }

    if (sock) {
      try { sock.ev.removeAllListeners(); } catch {}
      try { sock.ws?.close(); } catch {}
    }

    sock = makeWASocket({
      version,
      logger,
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      msgRetryCounterCache,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      }
    });

    global.zushiSock = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', (upsert) => handleMessage(sock, upsert));
    sock.ev.on('presence.update', handlePresenceUpdate);
    sock.ev.on('call', handleIncomingCall);
    sock.ev.on('group-participants.update', (update) => handleGroupParticipantsUpdate(sock, update));
    sock.ev.on('groups.update', (updates) => handleGroupsUpdate(sock, updates));
    sock.ev.on('connection.update', (update) => handleConnectionUpdate(update));

    if (needsPairing) {
      pairingRequested = true;
      const number = pairingNumber.replace(/\D/g, '');
      if (!number) {
        logStatus('pairing', 'numero non valido', 'error');
        process.exit(1);
      }

      await sleep(1500);
      try {
        let code = await sock.requestPairingCode(number);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        logStatus('pair code', code, 'ok');
        logStatus('whatsapp', 'Dispositivi collegati > Collega un dispositivo > Collega con numero di telefono', 'info');
        logStatus('nota', 'non aspettare una notifica push: inserisci manualmente il codice', 'warn');
      } catch (error) {
        logError('pairing code', error);
        process.exit(1);
      }
    }
  } finally {
    starting = false;
  }
}

async function checkAndSendRestartNotification(sock) {
  const restartFile = path.join(__dirname, 'db', 'restart.json');
  if (!fs.existsSync(restartFile)) return;

  try {
    const data = JSON.parse(fs.readFileSync(restartFile, 'utf-8') || '{}');
    if (data && data.jid) {
      const mainPrefix = getPrefixes()[0] || '.';
      const buttons = [
        { buttonId: `${mainPrefix}riavvia`, buttonText: { displayText: '🔄 Riavvia' }, type: 1 },
        { buttonId: `${mainPrefix}ping`, buttonText: { displayText: '🏓 Ping' }, type: 1 }
      ];

      await sock.sendMessage(data.jid, {
        text: '⚡ *Zushi Riavviato con Successo!*',
        footer: 'Zushi Bot ⚡',
        buttons,
        headerType: 1
      });
    }
  } catch (err) {
    logError('restart notification', err);
  } finally {
    try { fs.unlinkSync(restartFile); } catch {}
  }
}

function handleConnectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update;

  if (qr && loginMode !== 'code') {
    console.log(chalk.yellow('\nScansiona questo QR con WhatsApp:\n'));
    qrcode.generate(qr, { small: true });
  }

  if (connection === 'open') {
    reconnectAttempts = 0;
    logStatus('socket', `${botName} connesso correttamente`, 'ok');
    initializeKnownGroups(sock);

    if (!global.betChecker) {
      global.betChecker = new BetChecker(sock);
      global.betChecker.start();
      logStatus('bet checker', 'Avviato controllo schedine in background', 'ok');
    } else {
      global.betChecker.sock = sock;
    }

    checkAndSendRestartNotification(sock);

    return;
  }

  if (connection !== 'close') return;

  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const message = lastDisconnect?.error?.message || '';
  logStatus('socket', `connessione chiusa: ${statusCode || 'sconosciuto'}${message ? ` (${message})` : ''}`, 'error');

  try { sock?.ev?.removeAllListeners(); } catch {}
  try { sock?.ws?.close(); } catch {}
  sock = null;
  global.zushiSock = null;

  if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
    logStatus('session', 'scollegata: sposta la cartella session e abbina di nuovo', 'error');
    process.exit(1);
  }

  if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
    logStatus('socket', `connessione sostituita: avvia una sola istanza di ${botName}`, 'error');
    process.exit(1);
  }

  scheduleReconnect(statusCode);
}

function scheduleReconnect(statusCode) {
  if (reconnectTimer) return;

  reconnectAttempts += 1;
  const delay = Math.min(60000, 5000 * reconnectAttempts);
  logStatus('reconnect', `tra ${Math.round(delay / 1000)}s dopo errore ${statusCode || 'sconosciuto'}`, 'warn');

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    start().catch((error) => logError('restart socket', error));
  }, delay);
}

process.on('uncaughtException', (error) => logError('uncaught exception', error));
process.on('unhandledRejection', (error) => logError('unhandled rejection', error));

const handleShutdown = async (signal) => {
  logStatus('shutdown', `Segnale ${signal} ricevuto. Chiusura del bot in corso...`, 'warn');
  try {
    if (sock) {
      await sock.ws?.close();
    }
  } catch {}
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

await loadPlugins();
start().catch((error) => {
  logError('startup', error);
  process.exit(1);
});
