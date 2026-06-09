import { watchFile } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import chalk from 'chalk'
import fs from 'fs'
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

/*╭━━━⚡ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ⚡━━━╮*/

global.prefisso = '.'
global.sam = ['393780560229']
global.owner = [
  ['393780560229', 'luxifer', true],  
  ['393291944932', 'The Danger Core', true], // Nuovo Owner Aggiunto
  ['9647802910837', 'Zak', true], 
  ['4915511934253', 'Tom', true], 
]
global.mods = ['212781816909', '390935931875']
global.prems = ['212781816909', '390935931875']

/*╰━━━━━━━━━━━━━━━━━━━━╯*/

/*╭━━━☠️ INFO BOT ☠️━━━╮*/

global.nomepack = '𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ⚡'
global.nomebot = '⚡ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ⚡'
global.wm = '⚡ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ⚡'
global.autore = 'SⒶ𝔪'
global.dev = '⋆｡˚- SⒶ𝔪'
global.testobot = `☠️ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 ☠️`
global.versione = pkg.version
global.errore = '☠️ *Rituale fallito!* Usa il comando `.segnala <errore>` per notificare il collasso del sistema.'

/*╰━━━━━━━━━━━━━━━━━━━╯*/

/*╭━━━🕷️ LINK SYSTEM 🌐━━━╮*/

global.repobot = 'https://github.com/realvare/varebot'
global.gruppo = 'https://chat.whatsapp.com/bysamakavare'
global.canale = 'https://whatsapp.com/channel/0029VbB41Sa1Hsq1JhsC1Z1z'
global.insta = 'https://www.instagram.com/samakavare'

/*╰━━━━━━━━━━━━━━━━━━━━━╯*/

/*⭑⭒━━━✦❘🗝️ API KEYS 🌍༺❘✦━━━⭒⭑*/

// Le chiavi sono rimaste invariate come richiesto
global.APIKeys = {
    spotifyclientid: 'varebot',
    spotifysecret: 'varebot',
    browserless: 'varebot',
    tmdb: 'varebot',
    ocrspace: 'jjjsheu',
    assemblyai: 'varebot',
    google: 'varebot',
    googleCX: 'varebot',
    genius: 'varebot',
    removebg: 'varebot',
    openrouter: 'varebot',
    sightengine_user: 'varebot',
    sightengine_secret: 'varebot',
    lastfm: 'varebot',
}

/*╭━━━🩸 SISTEMA XP/EURO 💸━━━╮*/

global.multiplier = 1

/*╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯*/

/*╭━━━📦 SYSTEM RELOAD 📦━━━╮*/

let filePath = fileURLToPath(import.meta.url)
let fileUrl = pathToFileURL(filePath).href

const reloadConfig = async () => {
  console.log(chalk.bgHex('#b91c1c')(chalk.white.bold(" ⚡ [DANGER SYSTEM] File: 'config.js' Aggiornato ed Iniettato Correttamente ")))
  try {
    await import(`${fileUrl}?update=${Date.now()}`)
  } catch (e) {
    console.error('💀 Errore fatale nel reload di config.js:', e)
  }
}

watchFile(filePath, reloadConfig)
