import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');


process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import './config.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, rmSync, watch } from 'fs';
import yargs from 'yargs';
import { spawn } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { tmpdir } from 'os';
import { format } from 'util';
import pino from 'pino';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import storeHelper from './lib/store.js';
import { Low, JSONFile } from 'lowdb';
import readline from 'readline';
import NodeCache from 'node-cache';

const authFolder = global.authFile || '333BotSession';
global.authFile = authFolder;
global.authFileJB = global.authFileJB || '333bot-sub';
global.rcanal = '120363341274693350@newsletter';
const sessionFolder = path.join(process.cwd(), authFolder);
const tempDir = join(process.cwd(), 'temp');
const tmpDir = join(process.cwd(), 'tmp');

if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

const AUTH_STATE_FILE_PREFIXES = [
  'pre-key-',
  'session-',
  'sender-key-',
  'app-state-sync-key-',
  'app-state-sync-version-',
  'sender-key-memory-'
];

if (process.send) {
  process.on('message', (msg) => {
    if (typeof msg === 'string') {
      process.stdin.emit('data', Buffer.from(msg + '\n'));
    }
  });
}

let sessionCleanupRunning = false;
let dbWriteInProgress = false;
let dbWritePending = false;

function isProtectedAuthStateFile(entry) {
  return entry === 'creds.json' || AUTH_STATE_FILE_PREFIXES.some(prefix => entry.startsWith(prefix));
}

function isLikelyAuthStateFile(entry) {
  return isProtectedAuthStateFile(entry) || entry.endsWith('.json');
}

function isConnectionReadyForCleanup() {
  return global.stopped === 'open' && !!global.conn?.user;
}

async function runSessionCleanup(task) {
  if (sessionCleanupRunning || !isConnectionReadyForCleanup()) return;
  sessionCleanupRunning = true;
  try {
    await task();
  } finally {
    sessionCleanupRunning = false;
  }
}

function clearSessionFolderSelective(dir = sessionFolder) {
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch {}
    } else {
      if (isLikelyAuthStateFile(entry)) continue;
      try { fs.unlinkSync(fullPath); } catch {}
    }
  }
}

function purgeSession(sessionDir, cleanPreKeys = false, maxPreKeyAgeDays = 7) {
  if (!existsSync(sessionDir)) return;
  const files = readdirSync(sessionDir);
  files.forEach(file => {
    if (file === 'creds.json') return;
    const filePath = path.join(sessionDir, file);
    const stats = statSync(filePath);
    const fileAge = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (file.startsWith('pre-key') && cleanPreKeys) {
      if (fileAge > maxPreKeyAgeDays) { try { unlinkSync(filePath); } catch {} }
      return;
    }

    if (stats.isDirectory()) {
      try { rmSync(filePath, { recursive: true, force: true }); } catch {}
      return;
    }

    if (!isLikelyAuthStateFile(file)) {
      try { unlinkSync(filePath); } catch {}
    }
  });
}

global.dbDirty = false;
global.markDbDirty = function markDbDirty() {
  global.dbDirty = true;
};

async function flushDatabase({ force = false } = {}) {
  if (!global.db?.data) return false;
  if (!force && !global.dbDirty) return false;

  if (dbWriteInProgress) {
    dbWritePending = true;
    return false;
  }

  dbWriteInProgress = true;
  try {
    await global.db.write();
    global.dbDirty = false;
    return true;
  } catch (error) {
    global.dbDirty = true;
    throw error;
  } finally {
    dbWriteInProgress = false;
    if (dbWritePending) {
      dbWritePending = false;
      try {
        await flushDatabase({ force: true });
      } catch (error) {
        console.error(error);
      }
    }
  }
}

const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, DisconnectReason } = await import('@realvare/baileys');
const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
protoType();
serialize();
global.isLogoPrinted = false;
global.qrGenerated = false;
global.connectionMessagesPrinted = {};
let methodCodeQR = process.argv.includes("qr");
let methodCode = process.argv.includes("code");
let MethodMobile = process.argv.includes("mobile");
let phoneNumber = global.botNumberCode;
const hasExistingSession = existsSync(`./${global.authFile}/creds.json`);
let pairingMode = methodCodeQR ? 'qr' : methodCode ? 'code' : null;
let pairingCodeRequested = false;
let lastConnectionStateLogged = null;
let successfulConnectionLogged = false;

function logSystem(message, color = 'cyanBright') {
  const printer = chalk[color] || chalk.cyanBright;
  console.log(printer(`ã 333 BOT ã ${message}`));
}

function normalizePhoneNumberInput(value = '') {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function formatPairingCode(code = '') {
  return code?.match(/.{1,4}/g)?.join('-')?.toUpperCase() || code;
}

function getConnectionLabel() {
  const user = global.conn?.user;
  if (!user) return 'account sconosciuto';
  const id = String(user.id || '').split(':')[0];
  const name = user.name || user.verifiedName || 'Bot';
  return `${name} (${id || 'jid sconosciuto'})`;
}

function logConnectionState(state, color = 'cyanBright') {
  if (!state || lastConnectionStateLogged === state) return;
  lastConnectionStateLogged = state;
  logSystem(state, color);
}

function redefineConsoleMethod(methodName, filterStrings) {
  const originalConsoleMethod = console[methodName];
  console[methodName] = function () {
    const message = arguments[0];
    if (typeof message === 'string' && filterStrings.some(filterString => message.includes(atob(filterString)))) {
      arguments[0] = "";
    }
    originalConsoleMethod.apply(console, arguments);
  };
}

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};
global.__dirname = function dirname(pathURL) { return path.dirname(global.__filename(pathURL, true)); };
global.__require = function require(dir = import.meta.url) { return createRequire(dir); };
global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '');
global.timestamp = { start: new Date };
const __dirname = global.__dirname(import.meta.url);
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '.').replace(/[|\\{}()[\]^$+*.\-\^]/g, '\\$&') + ']');
global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile('database.json'));
global.DATABASE = global.db;
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function () {
      if (!global.db.READ) { clearInterval(this); resolve(global.db.data == null ? global.loadDatabase() : global.db.data); }
    }, 1 * 1000));
  }
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {}, ...(global.db.data || {}) };
  global.db.chain = chain(global.db.data);
  global.dbDirty = false;
};
loadDatabase();

global.conns = [];
global.creds = 'creds.json';

const { state, saveCreds } = await useMultiFileAuthState(global.authFile);
const msgRetryCounterMap = (MessageRetryMap) => { };
const msgRetryCounterCache = new NodeCache();
const { version } = await fetchLatestBaileysVersion();
let rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

const question = (t) => {
  rl.clearLine(rl.input, 0);
  return new Promise((resolver) => {
    rl.question(t, (r) => { rl.clearLine(rl.input, 0); resolver(r.trim()); });
  });
};

async function askValidatedChoice(prompt, validator, invalidMessage) {
  let answer;
  do {
    answer = await question(prompt);
    if (!validator(answer)) logSystem(invalidMessage, 'yellowBright');
  } while (!validator(answer));
  return answer;
}

async function askValidatedPhoneNumber() {
  while (true) {
    const input = await question(chalk.bgBlack(chalk.bold.bgMagentaBright(`Inserisci il numero di WhatsApp.\n${chalk.bold.yellowBright("Esempio: +393471234567")}\n`)));
    const normalized = normalizePhoneNumberInput(input);
    if (normalized) return { input, normalized };
    logSystem('Numero non valido. Inserisci il prefisso internazionale completo.', 'yellowBright');
  }
}

async function requestPairingCodeFlow() {
  if (pairingCodeRequested || global.conn?.authState?.creds?.registered) return;

  pairingCodeRequested = true;
  try {
    let normalizedNumber;
    if (phoneNumber) {
      normalizedNumber = normalizePhoneNumberInput(phoneNumber);
      if (!normalizedNumber) throw new Error('Il numero configurato in global.botNumberCode non e valido');
      phoneNumber = `+${normalizedNumber}`;
    } else {
      const input = await askValidatedPhoneNumber();
      normalizedNumber = input.normalized;
      phoneNumber = `+${normalizedNumber}`;
    }

    logSystem(`Avvio pairing code per ${phoneNumber}...`, 'blueBright');
    const pairingCode = await global.conn.requestPairingCode(normalizedNumber);
    const formattedCode = formatPairingCode(pairingCode);

    console.log(chalk.bold.white(chalk.bgBlueBright('ê°ð©¸ê± â¦â¢â« CODICE DI COLLEGAMENTO:')), chalk.bold.white(formattedCode));
    logSystem('Inserisci il codice su WhatsApp > Dispositivi collegati > Collega un dispositivo.', 'greenBright');
  } catch (error) {
    pairingCodeRequested = false;
    logSystem(`Impossibile generare il pairing code: ${error.message}`, 'redBright');
  }
}

let opzione;
if (!pairingMode && !hasExistingSession) {
  const menu = `
${chalk.bgBlue.white('âââââââââââââââââââââââââ')}
${chalk.bgBlue.white('â     333 BOT 2026      â')}
${chalk.bgBlue.white('â         V10           â')}
${chalk.bgBlue.white('âââââââââââââââââââââââââ')}

${chalk.yellow('Seleziona come collegarti:')}

${chalk.green('[1] ð² QR CODE')}
${chalk.gray('    â Scansiona con la fotocamera')}

${chalk.green('[2] ð CODICE (8 caratteri)')}
${chalk.gray('    â Codice da inserire')}

${chalk.gray('ââââââââââââââââââââââââ')}

${chalk.cyan('Scegli solo 1 o 2 â')}
`;

  opzione = await askValidatedChoice(
    menu + '\nâ¤ ',
    value => /^[1-2]$/.test(value),
    'â Inserisci solo 1 o 2, non inventarti nuovi numeri.'
  );

  pairingMode = opzione === '1' ? 'qr' : 'code';
}

if (hasExistingSession) {
  logSystem(`Sessione trovata in ${global.authFile}. Avvio con credenziali esistenti.`, 'whiteBright');
} else if (pairingMode === 'qr') {
  logSystem('Modalita pairing selezionata: QR code.', 'whiteBright');
} else if (pairingMode === 'code') {
  logSystem('Modalita pairing selezionata: codice a 8 caratteri.', 'whiteBright');
}

const filterStrings = [
  "Q2xvc2luZyBzdGFsZSBvcGVu",
  "Q2xvc2luZyBvcGVuIHNlc3Npb24=",
  "RmFpbGVkIHRvIGRlY3J5cHQ=",
  "U2Vzc2lvbiBlcnJvcg==",
  "RXJyb3I6IEJhZCBNQUM=",
  "RGVjcnlwdGVkIG1lc3NhZ2U="
];
console.info = () => { };
console.debug = () => { };
['log', 'warn', 'error'].forEach(methodName => redefineConsoleMethod(methodName, filterStrings));

const groupMetadataCache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: -1 });
global.groupCache = groupMetadataCache;

const logger = pino({
  level: 'silent',
  redact: { paths: ['creds.*','auth.*','account.*','media.*.directPath','media.*.url','node.content[*].enc','password','token','*.secret'], censor: '***' },
  timestamp: () => `,"time":"${new Date().toJSON()}"`
});

global.jidCache = new NodeCache({ stdTTL: 600, useClones: false, maxKeys: -1 });
global.lidCache = new NodeCache({ stdTTL: 86400, useClones: false, maxKeys: -1 });
const originalLidCacheSet = global.lidCache.set.bind(global.lidCache);
global.lidCache.set = (lid, pn, ttl) => {
  if (!lid || !pn) return false;
  const normalizedLid = String(lid);
  const pnString = String(pn);
  const normalizedPn = pnString.includes('@') ? pnString : `${pnString.replace(/\D/g, '')}@s.whatsapp.net`;
  global.jidCache.del(normalizedLid);
  global.jidCache.set(normalizedLid, normalizedPn);
  return originalLidCacheSet(normalizedLid, normalizedPn, ttl);
};
global.store = {
  bind(conn) {
    return storeHelper.bind(conn);
  },
  loadMessage: storeHelper.loadMessage,
};

const connectionOptions = {
  logger,
  printQRInTerminal: pairingMode === 'qr',
  mobile: MethodMobile,
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  browser: ["Ubuntu", "Chrome", "20.0.04"],
  version,
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: false,
  syncFullHistory: false,
  linkPreviewImageThumbnailWidth: 0,
  getMessage: async (key) => {
    if (global.store) {
      const msg = await global.store.loadMessage(key.remoteJid, key.id)
      return msg?.message || undefined
    }
    return proto.Message.fromObject({})
  },
  defaultQueryTimeoutMs: 30000,
  connectTimeoutMs: 30000,
  keepAliveIntervalMs: 15000,
  emitOwnEvents: true,
  fireInitQueries: true,
  transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 500 },
  lidCache: global.lidCache,
  cachedGroupMetadata: async (jid) => {
    const cached = global.groupCache.get(jid);
    if (cached) return cached;
    try {
      const metadata = await global.conn.groupMetadata(global.conn.decodeJid(jid));
      global.groupCache.set(jid, metadata);
      return metadata;
    } catch { return {}; }
  },
  decodeJid: (jid) => {
    if (!jid) return jid;
    const cached = global.jidCache.get(jid);
    if (cached) return cached;
    let decoded = jid;
    if (/:\d+@/gi.test(jid)) decoded = jidNormalizedUser(jid);
    if (typeof decoded === 'object' && decoded.user && decoded.server) decoded = `${decoded.user}@${decoded.server}`;
    if (typeof decoded === 'string' && decoded.endsWith('@lid')) {
      const mapped = global.lidCache.get(decoded);
      decoded = typeof mapped === 'string' && mapped ? mapped : decoded;
    }
    global.jidCache.set(jid, decoded);
    return decoded;
  },
  msgRetryCounterCache,
  retryRequestDelayMs: 500,
  maxMsgRetryCount: 5,
  shouldIgnoreJid: jid => false
};

global.conn = makeWASocket(connectionOptions);
global.store.bind(global.conn);

if (!hasExistingSession && pairingMode === 'code') {
  setTimeout(async () => {
    await requestPairingCodeFlow();
  }, 3000);
}

conn.isInit = false;
conn.well = false;



if (global.db) setInterval(async () => {
  if (global.db.data) await flushDatabase().catch(console.error);
  if (opts['autocleartmp'] && (global.support || {}).find) {
    const tmp = [tmpdir(), 'tmp'];
    tmp.forEach(filename => spawn('find', [filename, '-amin', '2', '-type', 'f', '-delete']));
  }
}, 30 * 1000);

if (global.db) setInterval(async () => {
  if (global.db.data) await flushDatabase({ force: true }).catch(console.error);
}, 5 * 60 * 1000);

if (opts['server']) (await import('./server.js')).default(global.conn, PORT);

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update;
  global.stopped = connection;
  if (isNewLogin) conn.isInit = true;
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();

  if (connection === 'connecting') {
    logConnectionState('Connessione a WhatsApp in corso...', 'whiteBright');
  }

   if (qr && pairingMode === 'qr' && !global.qrGenerated) {
    console.log(chalk.bold.hex('#8b5cf6')(`
           333 BOT                 
        CONNESSIONE QR           

ð² Scansiona il QR qui sotto
â³ Valido per ~45 secondi

âââââââââââââââ
`));
    logSystem('Apri WhatsApp > Dispositivi collegati > Collega un dispositivo e scansiona il QR.', 'whiteBright');
    global.qrGenerated = true;
  }

  if (connection === 'open') {
    lastConnectionStateLogged = 'open';
    global.qrGenerated = false;
    global.connectionMessagesPrinted = {};
    successfulConnectionLogged = true;

    logSystem(`Bot collegato con successo come ${getConnectionLabel()}`, 'whiteBright');
    logSystem(`Sessione attiva: ${global.authFile} | Pairing: ${hasExistingSession ? 'sessione esistente' : pairingMode || 'automatico'}`, 'whiteBright');

  }

  if (connection === 'close') {
    successfulConnectionLogged = false;
    lastConnectionStateLogged = 'close';
    if (!global.conn?.authState?.creds?.registered) pairingCodeRequested = false;
    const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
    if (reason === DisconnectReason.badSession && !global.connectionMessagesPrinted.badSession) {
      console.log(chalk.bold.redBright(`\n[ â ï¸ ] ððð¬ð¬ð¢ð¨ð§ð ðð«ð«ðð­ð, ðð«ð«ðð­ð, ðð¥ð¢ð¦ð¢ð§ð ð¥ð ððð«ð­ðð¥ð¥ð ${global.authFile} ðð ðð¬ðð ð®ð¢ ð§ð®ð¨ð¯ðð¦ðð§ð­ð ð¥ð ð¬ððð§ð¬ð¢ð¨ð§ð.`));
      global.connectionMessagesPrinted.badSession = true;
      process.exit(1);
    } else if (reason === DisconnectReason.loggedOut && !global.connectionMessagesPrinted.loggedOut) {
      console.log(chalk.bold.redBright(`\n[ â ï¸ ] ðð¨ð§ð§ðð¬ð¬ð¢ð¨ð§ð ðð¡ð¢ð®ð¬ð, ðð¥ð¢ð¦ð¢ð§ð ð¥ð ððð«ð­ðð¥ð¥ð ${global.authFile} ðð ðð¬ðð ð®ð¢ ð§ð®ð¨ð¯ðð¦ðð§ð­ð ð¥ð ð¬ððð§ð¬ð¢ð¨ð§ð.`));
      global.connectionMessagesPrinted.loggedOut = true;
      process.exit(1);
    } else if (reason === DisconnectReason.connectionReplaced && !global.connectionMessagesPrinted.connectionReplaced) {
      console.log(chalk.bold.yellowBright(`[ â ï¸ ] ðð¨ð§ð§ðð¬ð¬ð¢ð¨ð§ð ð¬ð¨ð¬ð­ð¢ð­ð®ð¢ð­ð, ð' ð¬ð­ðð­ð ðð©ðð«ð­ð ð®ð§'ðð¥ð­ð«ð ð§ð®ð¨ð¯ð ð¬ðð¬ð¬ð¢ð¨ð§ð. ððð« ð©ð«ð¢ð¦ð ðð¨ð¬ð ðð¢ð¬ðð¨ð§ðð­ð­ð¢ð­ð¢ ððð¥ðð§ð­ð¢ ððð¥ð ð¬ðð¬ð¬ð¢ð¨ð§ð ðð¨ð«ð«ðð§ð­ð.`));
      global.connectionMessagesPrinted.connectionReplaced = true;
      process.exit(1);
    } else if (reason === DisconnectReason.connectionLost && !global.connectionMessagesPrinted.connectionLost) {
      console.log(chalk.bold.blueBright(`\n[ â ï¸ ] ðð¨ð§ð§ðð¬ð¬ð¢ð¨ð§ð ð©ðð«ð¬ð ðð¥ ð¬ðð«ð¯ðð«, ð«ð¢ðð¨ð§ð§ ðð¬ð¬ð¢ð¨ð§ð ð¢ ð§ ðð¨ð«ðð§ð­ð¢...`));
      global.connectionMessagesPrinted.connectionLost = true;
    } else if (reason === DisconnectReason.timedOut && !global.connectionMessagesPrinted.timedOut) {
      console.log(chalk.bold.yellowBright(`\n[ â ï¸ ] ð ð¨ð§ð§ðð¬ðð§ð ð¬ðððð®ð­ð, ð«ð¢ðð¨ð§ð§ðð¬ð¬ ð¢ð¨ð§ð ð¢ ð§ ðð¨ð«ðð§ ð­ð¢...`));
      global.connectionMessagesPrinted.timedOut = true;
    }
  }
}

process.on('uncaughtException', console.error);

(async () => {
  try {
    conn.ev.on('connection.update', connectionUpdate);
    conn.ev.on('creds.update', saveCreds);
  } catch (error) {
    console.error(chalk.bold.bgRedBright(`Errore nell'avvio del bot: `, error));
  }
})();

let isInit = true;
let handler = await import('./handler.js').catch(e => {
    console.error('â ERRORE IMPORT HANDLER:', e)
    process.exit(1)
})


global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(e => {
      console.error('â ERRORE IMPORT HANDLER.JS:', e)
      return null
    })
    
    if (!Handler) {
      console.error('â Handler Ã¨ null, import fallito')
      return false
    }
    
    if (!Handler.handler) {
      console.error('â Handler.handler Ã¨ undefined! Keys disponibili:', Object.keys(Handler))
      return false
    }
    
    if (Object.keys(Handler).length) handler = Handler
  } catch (e) { 
    console.error('â ERRORE in reloadHandler:', e)
    return false
  }

  if (restatConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch {}
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    global.store.bind(global.conn)
    isInit = true
  }

  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('group-participants.update', conn.participantsUpdate)
    conn.ev.off('groups.update', conn.groupsUpdate)
    conn.ev.off('message.delete', conn.onDelete)
    conn.ev.off('call', conn.onCall)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.welcome = '@user benvenuto/a in @subject'
  conn.bye = '@user ha abbandonato il gruppo'
  conn.spromote = '@user Ã¨ stato promosso ad amministratore'
  conn.sdemote = '@user non Ã¨ piÃ¹ amministratore'
  conn.sIcon = 'immagine gruppo modificata'
  conn.sRevoke = 'link reimpostato, nuovo link: @revoke'

  conn.handler = handler.handler.bind(global.conn)
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn)
  conn.groupsUpdate = handler.groupsUpdate.bind(global.conn)
  conn.onDelete = handler.deleteUpdate.bind(global.conn)
  conn.onCall = handler.callUpdate.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn, true)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('group-participants.update', conn.participantsUpdate)
  conn.ev.on('groups.update', conn.groupsUpdate)
  conn.ev.on('message.delete', conn.onDelete)
  conn.ev.on('call', conn.onCall)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)
  isInit = false
  return true
}


const pluginFolder = join(__dirname, 'plugins');
const pluginFilter = (filename) => /\.js$/i.test(filename);
global.plugins = {};

function normalizePluginKey(filePath) {
  return path.relative(pluginFolder, filePath).replace(/\\/g, '/');
}

function getPluginFiles(dir = pluginFolder) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getPluginFiles(fullPath));
      continue;
    }

    if (entry.isFile() && pluginFilter(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function filesInit() {
  for (const filePath of getPluginFiles()) {
    const pluginKey = normalizePluginKey(filePath);
    try {
      const file = global.__filename(filePath);
      const module = await import(file);
      global.plugins[pluginKey] = module.default || module;
    } catch (e) {
      conn.logger.error(e);
      delete global.plugins[pluginKey];
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
  if (!filename || !pluginFilter(filename)) return;

  const filePath = join(pluginFolder, filename);
  const pluginKey = normalizePluginKey(filePath);
  const fileExists = existsSync(filePath);

  if (pluginKey in global.plugins) {
    if (fileExists) conn.logger.info(chalk.green(`â AGGIORNATO - '${pluginKey}'`));
    else {
      conn.logger.warn(`ðï¸ FILE ELIMINATO: '${pluginKey}'`);
      delete global.plugins[pluginKey];
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
      return;
    }
  } else if (fileExists) {
    conn.logger.info(`ð NUOVO PLUGIN: '${pluginKey}'`);
  }

  if (!fileExists) return;

  const err = syntaxerror(fs.readFileSync(filePath), pluginKey, { sourceType: 'module', allowAwaitOutsideFunction: true });
  if (err) conn.logger.error(`â ERRORE SINTASSI: '${pluginKey}'\n${format(err)}`);
  else {
    try {
      const module = (await import(`${global.__filename(filePath)}?update=${Date.now()}`));
      global.plugins[pluginKey] = module.default || module;
    } catch (e) {
      conn.logger.error(`â ï¸ ERRORE PLUGIN: '${pluginKey}\n${format(e)}'`);
    } finally {
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
    }
  }
};
Object.freeze(global.reload);
const pluginWatcher = watch(pluginFolder, { recursive: true }, global.reload);
pluginWatcher.setMaxListeners(20);
await global.reloadHandler();

function clearDirectory(dirPath) {
  if (!existsSync(dirPath)) { try { mkdirSync(dirPath, { recursive: true }); } catch (e) { console.error(chalk.red(`Errore creazione ${dirPath}:`, e)); } return; }
  readdirSync(dirPath).forEach(file => {
    const filePath = join(dirPath, file);
    try {
      const stats = statSync(filePath);
      if (stats.isFile()) unlinkSync(filePath);
      else if (stats.isDirectory()) rmSync(filePath, { recursive: true, force: true });
    } catch (e) { console.error(chalk.red(`Errore pulizia ${filePath}:`, e)); }
  });
}

function ripristinaTimer(conn) {
  if (conn.timerReset) clearInterval(conn.timerReset);
  conn.timerReset = setInterval(async () => {
    if (stopped === 'close' || !conn || !conn.user) return;
    await clearDirectory(join(__dirname, 'tmp'));
    await clearDirectory(join(__dirname, 'temp'));
  }, 1000 * 60 * 30);
}

let filePath = fileURLToPath(import.meta.url);
const mainWatcher = watch(filePath, async () => {
  await global.reloadHandler(true).catch(console.error);
});
mainWatcher.setMaxListeners(20);
