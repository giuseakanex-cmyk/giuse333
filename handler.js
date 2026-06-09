import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import NodeCache from 'node-cache'
import { getAggregateVotesInPollMessage, toJid } from '@realvare/baileys'

global.ignoredUsersGlobal = new Set()
global.ignoredUsersGroup = {}
global.groupSpam = {}

if (!global.groupCache) {
    global.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })
}
if (!global.jidCache) {
    global.jidCache = new NodeCache({ stdTTL: 600, useClones: false })
}
if (!global.nameCache) {
    global.nameCache = new NodeCache({ stdTTL: 600, useClones: false });
}

export const fetchMetadata = async (conn, chatId) => await conn.groupMetadata(chatId)

const fetchGroupMetadataWithRetry = async (conn, chatId, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await conn.groupMetadata(chatId);
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

if (!global.cacheListenersSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                if (!update || !update.id) {
                    continue;
                }
                try {
                    const metadata = await fetchGroupMetadataWithRetry(conn, update.id)
                    if (!metadata) {
                        continue
                    }
                    global.groupCache.set(update.id, metadata, { ttl: 300 })
                } catch (e) {
                    if (!e.message?.includes('not authorized') && !e.message?.includes('chat not found') && !e.message?.includes('not in group')) {
                        console.error(chalk.redBright(`[☠️ DANGER ERROR] Errore cache groups.update per ${update.id}:`), e)
                    }
                }
            }
        })
        global.cacheListenersSet = true
    }
}

if (!global.pollListenerSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('messages.update', async (chatUpdate) => {
            for (const { key, update } of chatUpdate) {
                if (update.pollUpdates) {
                    try {
                        const pollCreation = await global.store.getMessage(key)
                        if (pollCreation) {
                            await getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            })
                        }
                    } catch (e) {
                        console.error(chalk.redBright('[☠️ DANGER ERROR] Fallimento aggiornamento sondaggio:'), e)
                    }
                }
            }
        })
        global.pollListenerSet = true
    }
}

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))
const responseHandlers = new Map()

function initResponseHandler(conn) {
    if (!conn.waitForResponse) {
        conn.waitForResponse = async (chat, sender, options = {}) => {
            const {
                timeout = 30000,
                validResponses = null,
                onTimeout = null,
                filter = null
            } = options
            return new Promise((resolve) => {
                const key = chat + sender
                const timeoutId = setTimeout(() => {
                    responseHandlers.delete(key)
                    if (onTimeout) onTimeout()
                    resolve(null)
                }, timeout)
                responseHandlers.set(key, {
                    resolve,
                    timeoutId,
                    validResponses,
                    filter
                })
            })
        }
    }
}

global.processedCalls = global.processedCalls || new Map()
if (global.conn && global.conn.ws) {
    global.conn.ws.on('CB:call', async (json) => {
        try {
            if (!json?.tag || json.tag !== 'call' || !json.attrs?.from) {
                return
            }
            const callerId = global.conn.decodeJid(json.attrs.from)
            const isOwner = global.owner.some(([num]) => num === callerId.split('@')[0])
            if (isOwner) return

            const eventId = json.attrs.id
            let actualCallId = null
            if (json.content?.length > 0) {
                for (const item of json.content) {
                    if (item.attrs && item.attrs['call-id']) {
                        actualCallId = item.attrs['call-id']
                        break
                    }
                }
            }
            const uniqueCallId = actualCallId || eventId
            if (json.content?.length > 0) {
                const contentTags = json.content.map(item => item.tag)
                if (contentTags.includes('terminate')) {
                    global.processedCalls.delete(uniqueCallId)
                    return
                }
                if (contentTags.includes('relaylatency')) {
                    if (global.processedCalls.has(uniqueCallId)) {
                        return
                    }
                    global.processedCalls.set(uniqueCallId, true)

                    const numero = callerId.split('@')[0]
                    let nome = global.nameCache.get(callerId);
                    if (!nome) {
                      nome = global.conn.getName(callerId) || 'Sconosciuto'
                      global.nameCache.set(callerId, nome);
                    }
                    console.log(chalk.redBright(`[📞 𝐃𝐀𝐍𝐆𝐄𝐑] Connessione vocale non autorizzata rilevata da ${numero} - ${nome}`))

                    if (!global.db.data) await global.loadDatabase()
                    let settings = global.db.data?.settings?.[global.conn.user.jid]
                    if (!settings) {
                        settings = global.db.data.settings[global.conn.user.jid] = {
                            jadibotmd: false,
                            antiPrivate: true,
                            soloCreatore: false,
                            anticall: true,
                            status: 0
                        }
                    }
                    if (!settings.anticall) return

                    let user = global.db.data.users[callerId] || (global.db.data.users[callerId] = { callCount: 0, banned: false })
                    if (user.banned) {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        return
                    }
                    user.callCount = (user.callCount || 0) + 1
                    try {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        console.log(chalk.bgRed.black(`[☠️ REJECT] Chiamata di ${numero} - ${nome} respinta dal sistema.`))
                        if (user.callCount >= 3) {
                            user.banned = true
                            user.bannedReason = 'Spam di chiamate rilevato'
                            const msg = `☠️ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • 𝐔𝐓𝐄𝐍𝐓𝐄 𝐁𝐀𝐍𝐍𝐀𝐓𝐎\n╰➤ Il tuo legame è stato spezzato permanentemente per spam di chiamate.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        } else {
                            const msg = `⚠️ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐁𝐎𝐓 • 𝐀𝐕𝐕𝐈𝐒𝐎\n╰➤ Le chiamate vocali destabilizzano il bot. Non riprovare.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        }
                    } catch (err) {
                        console.error('[ERRORE] Impossibile terminare la chiamata:', err)
                        global.processedCalls.delete(uniqueCallId)
                    }
                }
            }
        } catch (e) {
            console.error('[ERRORE] Gestione chiamate interrotta:', e)
        }
    })
}

setInterval(() => {
    if (global.processedCalls.size > 10) {
        global.processedCalls.clear()
    }
}, 180000)

export async function participantsUpdate({ id, participants, action }) {
    if (global.db.data.chats[id]?.rileva === false) return

    try {
        let metadata = global.groupCache.get(id) || await fetchMetadata(this, id)
        if (!metadata) return

        global.groupCache.set(id, metadata, { ttl: 300 })
        for (const user of participants) {
            const normalizedUser = this.decodeJid(user)
            let userName = global.nameCache.get(normalizedUser);
            if (!userName) {
              userName = (await this.getName(normalizedUser)) || normalizedUser.split('@')[0] || 'Sconosciuto'
              global.nameCache.set(normalizedUser, userName);
            }
            switch (action) {
                case 'add':
                    break
                case 'remove':
                    break
                case 'promote':
                    break
                case 'demote':
                    break
            }
        }
    } catch (e) {
        console.error(`[ERRORE] Eccezione in participantsUpdate per ${id}:`, e)
    }
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
if (m.message?.protocolMessage?.type === 'MESSAGE_EDIT') {
    const key = m.message.protocolMessage.key;
    const editedMessage = m.message.protocolMessage.editedMessage;
    m.key = key;
    m.message = editedMessage;
    m.text = editedMessage.conversation || editedMessage.extendedTextMessage?.text || '';
    m.mtype = Object.keys(editedMessage)[0];
    console.log(chalk.yellow(`[⚡ EDIT] Struttura modificata in ${key.remoteJid}`));
}
    m = smsg(this, m, global.store)
    if (!m || !m.key || !m.chat || !m.sender) return
    if (m.fromMe) return
    if (m.key.participant && m.key.participant.includes(':') && m.key.participant.split(':')[1]?.includes('@')) return

    if (m.key) {
        m.key.remoteJid = this.decodeJid(m.key.remoteJid)
        if (m.key.participant) m.key.participant = this.decodeJid(m.key.participant)
    }
    if (!m.key.remoteJid) return
    if (!this.originalGroupParticipantsUpdate) {
        this.originalGroupParticipantsUpdate = this.groupParticipantsUpdate
        this.groupParticipantsUpdate = async function(chatId, users, action) {
            try {
                let metadata = global.groupCache.get(chatId)
                if (!metadata) {
                    metadata = await fetchMetadata(this, chatId)
                    if (metadata) global.groupCache.set(chatId, metadata, { ttl: 300 })
                }
                if (!metadata) {
                    console.error('[ERRORE] Allineamento metadati fallito nel protocollo di sicurezza')
                    return this.originalGroupParticipantsUpdate.call(this, chatId, users, action)
                }

                const correctedUsers = users.map(userJid => {
                    const decoded = this.decodeJid(userJid)
                    const phone = decoded.split('@')[0].replace(/:\d+$/, '')
                    const participant = metadata.participants.find(p => {
                        const pId = this.decodeJid(p.id)
                        const pPhone = pId.split('@')[0].replace(/:\d+$/, '')
                        return pPhone === phone
                    })
                    return participant ? participant.id : userJid
                })

                return this.originalGroupParticipantsUpdate.call(this, chatId, correctedUsers, action)
            } catch (e) {
                console.error('[ERRORE] Iniezione fallita in safeGroupParticipantsUpdate:', e)
                throw e
            }
        }
    }

    initResponseHandler(this)

    let user = null
    let chat = null
    let usedPrefix = null
    let normalizedSender = null
    let normalizedBot = null
    try {
        let eventHandled = false
        if (m.message?.eventResponseMessage) {
            const { eventId, response } = m.message.eventResponseMessage
            const jid = this.decodeJid(m.key.remoteJid)
            const userId = this.decodeJid(m.key.participant || m.key.remoteJid)
            const action = response === 'going' ? 'join' : 'leave'

            try {
                if (!global.activeEvents) global.activeEvents = new Map()
                if (!global.activeGiveaways) global.activeGiveaways = new Map()

                let eventData = global.activeEvents.get(eventId) || global.activeGiveaways.get(jid)
                if (eventData) {
                    if (!eventData.participants) eventData.participants = new Set()
                    if (action === 'join') {
                        eventData.participants.add(userId)
                    } else {
                        eventData.participants.delete(userId)
                    }
                    eventHandled = true
                }
            } catch (e) {
                console.error('[ERRORE] Event Response Fallito:', e)
            }
        }

        if (m.message?.interactiveResponseMessage) {
            const interactiveResponse = m.message.interactiveResponseMessage
            if (interactiveResponse.nativeFlowResponseMessage?.paramsJson) {
                try {
                    const params = JSON.parse(interactiveResponse.nativeFlowResponseMessage.paramsJson)
                    if (params.id) {
                        const fakeMessage = {
                            key: m.key,
                            message: { conversation: params.id },
                            messageTimestamp: m.messageTimestamp,
                            pushName: m.pushName,
                            broadcast: m.broadcast
                        }
                        const processedMsg = smsg(this, fakeMessage)
                        if (processedMsg) {
                            processedMsg.text = params.id
                            return handler.call(this, { messages: [processedMsg] })
                        }
                    }
                } catch (e) {
                    console.error('❌ Errore critico interactive response parsing:', e)
                }
            }
        }

        if (!global.db.data) await global.loadDatabase()
        m.exp = 0
        m.euro = false
        m.isCommand = false

        normalizedSender = this.decodeJid(m.sender)
        normalizedBot = this.decodeJid(this.user.jid)
        if (!normalizedSender) return;
        user = global.db.data.users[normalizedSender] || (global.db.data.users[normalizedSender] = {
            exp: 0,
            euro: 10,
            muto: false,
            registered: false,
            name: m.pushName || '?',
            age: -1,
            regTime: -1,
            banned: false,
            bank: 0,
            level: 0,
            firstTime: Date.now(),
            spam: 0
        })
        chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {
            isBanned: false,
            welcome: false,
            goodbye: false,
            ai: false,
            vocali: false,
            antiporno: false,
            antioneview: false,
            autolevelup: false,
            antivoip: false,
            rileva: false,
            modoadmin: false,
            antiLink: false,
            antiLink2: false,
            reaction: false,
            antispam: false,
            expired: 0,
            users: {}
        })
        let settings = global.db.data.settings[this.user.jid] || (global.db.data.settings[this.user.jid] = {
            autoread: false,
            jadibotmd: false,
            antiPrivate: true,
            soloCreatore: false,
            status: 0
        })

        if (m.mtype === 'pollUpdateMessage') return
        if (m.mtype === 'reactionMessage') return
        let groupMetadata = m.isGroup ? global.groupCache.get(m.chat) : null
        let participants = null
        let normalizedParticipants = null
        let isBotAdmin = false
        let isAdmin = false
        let isRAdmin = false
        let isSam = global.owner.some(([num]) => num + '@s.whatsapp.net' === normalizedSender)
        let isROwner = isSam || global.owner.some(([num]) => num + '@s.whatsapp.net' === normalizedSender)
        let isOwner = isROwner || m.fromMe
        let isMods = isOwner || global.mods?.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(normalizedSender) || false
        let isPrems = isROwner || global.prems?.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(normalizedSender) || false
        if (m.isGroup) {
            if (!groupMetadata) {
                groupMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
                if (groupMetadata) {
                    groupMetadata.fetchTime = Date.now()
                    global.groupCache.set(m.chat, groupMetadata, { ttl: 300 })
                }
            }
            if (groupMetadata) {
                participants = groupMetadata.participants
                normalizedParticipants = participants.map(u => {
                    const normalizedId = this.decodeJid(u.id)
                    return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                })
                const normalizedOwner = groupMetadata.owner ? this.decodeJid(groupMetadata.owner) : null
                const normalizedOwnerLid = groupMetadata.ownerLid ? this.decodeJid(groupMetadata.ownerLid) : null
                isAdmin = participants.some(u => {
                    const participantIds = [
                        this.decodeJid(u.id),
                        u.jid ? this.decodeJid(u.jid) : null,
                        u.lid ? this.decodeJid(u.lid) : null
                    ].filter(Boolean)
                    const isMatch = participantIds.includes(normalizedSender)
                    return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                })

                isBotAdmin = participants.some(u => {
                    const participantIds = [
                        this.decodeJid(u.id),
                        u.jid ? this.decodeJid(u.jid) : null,
                        u.lid ? this.decodeJid(u.lid) : null
                    ].filter(Boolean)
                    const isMatch = participantIds.includes(normalizedBot)
                    return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)

                isRAdmin = isAdmin && (normalizedSender === normalizedOwner || normalizedSender === normalizedOwnerLid)

                if (m.isGroup && !isAdmin) {
                    const secondMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
                    if (secondMetadata) {
                        secondMetadata.fetchTime = Date.now()
                        global.groupCache.set(m.chat, secondMetadata, { ttl: 300 })
                        participants = secondMetadata.participants
                        normalizedParticipants = participants.map(u => {
                            const normalizedId = this.decodeJid(u.id)
                            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                        })

                        isAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedSender)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        })

                        isBotAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedBot)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)
                    }
                }
            }
        }

        const ___dirname = join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin) continue

            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error('[ERRORE] Invocazione fallita in plugin.all:', e)
                }
            }

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix || global.prefix || '.'
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? _prefix.map(p => [p instanceof RegExp ? p : new RegExp(str2Regex(p)).exec(m.text), p]) :
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), _prefix]] :
                [[[], new RegExp]]).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                })) continue
            }

            if (typeof plugin !== 'function') continue
            
            if (!match || !match[0]) continue

            usedPrefix = (match[0] || '')[0]
            if (usedPrefix) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = command?.toLowerCase() || ''
                let fail = plugin.fail || global.dfail
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                    Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false

                if (!isAccept) continue

                if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
                    const freshMetadata = global.groupCache.get(m.chat) || await fetchGroupMetadataWithRetry(this, m.chat)
                    if (freshMetadata) {
                        freshMetadata.fetchTime = Date.now()
                        global.groupCache.set(m.chat, freshMetadata, { ttl: 300 })
                        groupMetadata = freshMetadata
                        participants = groupMetadata.participants
                        normalizedParticipants = participants.map(u => {
                            const normalizedId = this.decodeJid(u.id)
                            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                        })

                        const normalizedOwner = groupMetadata.owner ? this.decodeJid(groupMetadata.owner) : null
                        const normalizedOwnerLid = groupMetadata.ownerLid ? this.decodeJid(groupMetadata.ownerLid) : null

                        isAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedSender)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        })

                        isBotAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedBot)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)

                        isRAdmin = isAdmin && (normalizedSender === normalizedOwner || normalizedSender === normalizedOwnerLid)
                    }
                }

                if (plugin.disabled && !isOwner) {
                    fail('disabled', m, this)
                    continue
                }

                if (user.muto && !isROwner && !isOwner) {
                    await this.sendMessage(m.chat, { text: `☠️ 𝐌𝐔𝐓𝐎 𝐀𝐓𝐓𝐈𝐕𝐎\n╰➤ Sei privo di voce in questo reame.` }, { quoted: m }).catch(e => console.error(e))
                    return
                }

                const ignoredGlobally = global.ignoredUsersGlobal.has(normalizedSender)
                const ignoredInGroup = m.isGroup && global.ignoredUsersGroup[m.chat]?.has(normalizedSender)
                if ((ignoredGlobally || ignoredInGroup) && !isROwner) {
                    await this.sendMessage(m.chat, { text: `🚫 𝐀𝐂𝐂𝐄𝐒𝐒𝐎 𝐍𝐄𝐆𝐀𝐓𝐎\n╰➤ Non possiedi i sigilli necessari.` }, { quoted: m }).catch(e => console.error(e))
                    return
                }

                m.plugin = name
                if (chat.isBanned && !isROwner && !['gp-sbanchat.js', 'creatore-exec.js', 'gp-delete.js'].includes(name)) return
                if (user.banned && !isROwner && name !== 'creatore-banuser.js') {
                    if (user.antispam > 2) return
                    await this.sendMessage(m.chat, {
                        text: `💀 𝐔𝐓𝐄𝐍𝐓𝐄 𝐁𝐀𝐍𝐍𝐀𝐓𝐎\n╰➤ Il tuo legame con il bot è stato reciso permanentemente.\n\n${user.bannedReason ? `🥀 Motivo: ${user.bannedReason}` : `🥀 Motivo: Esecuzione automatica`}\n\n⚠️ Usa *${usedPrefix}segnala* per implorare clemenza.`
                    }, { quoted: m }).catch(e => console.error(e))
                    user.antispam++
                    return
                }

                if (m.isGroup && !isOwner && !isROwner && !isAdmin && chat.antispam) {
                    const groupData = global.groupSpam[m.chat] || (global.groupSpam[m.chat] = {
                        count: 0,
                        firstCommandTimestamp: 0,
                        isSuspended: false
                    })
                    const now = Date.now()
                    if (groupData.isSuspended) return

                    if (now - groupData.firstCommandTimestamp > 60000) {
                        groupData.count = 1
                        groupData.firstCommandTimestamp = now
                    } else {
                        groupData.count++
                    }

                    if (groupData.count > 8) {
                        groupData.isSuspended = true
                        await this.reply(m.chat, `╭━━━⚡ 𝐃𝐀𝐍𝐆𝐄𝐑 𝐒𝐏𝐀𝐌 ⚡━━━╮\n│ ⚠️ 𝐅𝐋𝐔𝐒𝐒𝐎 𝐒𝐎𝐕𝐑𝐀𝐂𝐂𝐀𝐑𝐈𝐂𝐀𝐓𝐎\n│ \n│ Rilevato spam compulsivo.\n│ Sistema congelato per 15 secondi.\n│ \n│ ☠️ The Danger osserva...\n╰━━━━━━━━━━━━━━━━━━━━╯`, m).catch(e => console.error(e))
                        setTimeout(() => {
                            delete global.groupSpam[m.chat]
                            console.log(chalk.redBright(`[Anti-Spam] Flusso comandi ripristinato per: ${m.chat}`))
                        }, 15000)
                        return
                    }
                }

                if (chat.modoadmin && !isOwner && !isROwner && m.isGroup && !isAdmin && !user.premium) return
                if (settings.soloCreatore && !isROwner) return

                if (plugin.sam && !isSam) {
                    fail('sam', m, this)
                    continue
                }
                if (plugin.rowner && !isROwner) {
                    fail('rowner', m, this)
                    continue
                }
                if (plugin.owner && !isOwner) {
                    fail('owner', m, this)
                    continue
                }
                if (plugin.mods && !isMods) {
                    fail('mods', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) {
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) {
                    fail('group', m, this)
                    continue
                }
                if (plugin.botAdmin && !isBotAdmin) {
                    fail('botAdmin', m, this)
                    continue
                }
                if (plugin.admin && !isAdmin) {
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) {
                    fail('private', m, this)
                    continue
                }
                if (plugin.register && !user.registered) {
                    fail('unreg', m, this)
                    continue
                }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (xp > 200) {
                    await this.reply(m.chat, 'bzzzzz', m).catch(e => console.error(e))
                } else {
                    m.exp += xp
                }

                if (!isPrems && plugin.euro && user.euro < plugin.euro) {
                    await this.reply(m.chat, `☠️ 𝐄𝐔𝐑𝐎 𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐂𝐈𝐄𝐍𝐓𝐈\n╰➤ Risorse non sufficienti per eseguire questo comando.`, m, null, global.fake).catch(e => console.error(e))
                    continue
                }

                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
                    command,
                    text,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }

                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.euro = plugin.euro || false
                } catch (e) {
                    m.error = e
                    console.error(`[☠️ ERROR] Errore esecuzione plugin nella chat ${m.chat}:`, e)
                    if (e.message.includes('rate-overlimit')) {
                        console.warn('[AVVISO] Sovraccarico, ritento stabilizzazione...')
                        await delay(2000)
                    }
                    let text = format(e)
                    await this.reply(m.chat, text, m).catch(e => console.error(e))
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error('[ERRORE] Eccezione in plugin.after:', e)
                        }
                    }
                    if (m.euro) {
                        await this.reply(m.chat, `\`Costo operazione: ${+m.euro} €\``, m, null, global.rcanal).catch(e => console.error(e))
                    }
                }
                break
            }
        }
    } catch (e) {
        console.error(`[ERRORE FATALE] Errore critico generato da ${m.sender}:`, e)
    } finally {
        if (m && user && user.muto && !m.fromMe) {
            await this.sendMessage(m.chat, { delete: m.key }).catch(e => console.error(e))
        }

        if (m && user) {
            user.exp += m.exp || 0
            user.euro -= m.euro * 1 || 0
            if (!user.messages) user.messages = 0;
            user.messages++;
            if (m.isGroup) {
                if (!chat.users) chat.users = {};
                const senderId = normalizedSender;
                if (!chat.users[senderId]) {
                    chat.users[senderId] = { messages: 0 };
                }
                chat.users[senderId].messages++;
            }

            if (m.plugin) {
                let stats = global.db.data.stats || (global.db.data.stats = {})
                let stat = stats[m.plugin] || (stats[m.plugin] = {
                    total: 0,
                    success: 0,
                    last: 0,
                    lastSuccess: 0
                })
                const now = +new Date
                stat.total += 1
                stat.last = now
                if (!m.error) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!global.opts['noprint'] && m) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.error('[ERRORE] Stampa terminata con errore:', e)
        }

        let settingsREAD = global.db.data.settings[this.user.jid] || {}
        if ((global.opts['autoread'] || settingsREAD.autoread2) && m) {
            await this.readMessages([m.key]).catch(e => console.error(e))
        }

        if (chat && chat.reaction && m?.text?.match(/(mente|zione|tà|ivo|osa|issimo|ma|però|eppure|anche|ma|no|se|ai|ciao|si)/gi) && !m.fromMe) {
            const emot = pickRandom([
                "💀", "🔥", "⚡", "👀", "🦇", "🕷️", "🩸", "⚔️", "⛓️", "🍷"
            ])
            await this.sendMessage(m.chat, { react: { text: emot, key: m.key } }).catch(e => console.error(e))
        }
    }
}

global.dfail = async (type, m, conn) => {
    const msg = {
        sam:      '🔐 𝐂𝐎𝐌𝐀𝐍𝐃𝐎 𝐑𝐈𝐒𝐄𝐑𝐕𝐀𝐓𝐎\n╰➤ Accesso consentito esclusivamente all\'Evocatore Supremo.',
        rowner:   '👑 𝐂𝐑𝐄𝐀𝐓𝐎𝐑𝐄 𝐒𝐔𝐏𝐑𝐄𝐌𝐎\n╰➤ Solo il Creatore può gestire o invocare questo protocollo.',
        owner:    '🛡️ 𝐒𝐈𝐆𝐈𝐋𝐋𝐎 𝐎𝐖𝐍𝐄𝐑\n╰➤ Questa azione richiede l\'autorizzazione degli Owner del nucleo.',
        mods:     '⚙️ 𝐂𝐎𝐍𝐓𝐑𝐎block𝐎 𝐌𝐎block𝐄𝐑𝐀𝐓𝐎𝐑𝐈\n╰➤ Funzionalità accessibile esclusivamente ai Moderatori.',
        premium:  '💎 𝐔𝐓𝐄𝐍𝐓𝐄 𝐏𝐑𝐄𝐌𝐈𝐔𝐌\n╰➤ Questo livello di potere è concesso solo agli utenti Premium.',
        group:    '👥  𝐍𝐄𝐈 𝐆𝐑𝐔𝐏𝐏𝐈\n╰➤ Il rituale deve essere consumato all\'interno di una chat di gruppo.',
        private:  '📩 𝐒𝐎𝐋𝐎 𝐈𝐍 𝐏𝐑𝐈𝐕𝐀𝐓𝐎 \n╰➤ Questa interazione è confinata esclusivamente in chat privata.',
        admin:    '🛠️ 𝐒𝐎𝐋𝐎 𝐈 𝐏𝐑𝐄𝐒𝐂𝐄𝐋𝐓𝐈 𝐒𝐅𝐈𝐆𝐀𝐓𝐎\n╰➤ Devi essere Amministratore del gruppo per imporre questo comando.',
        botAdmin: '🤖 𝐈𝐋 𝐁𝐎𝐓 𝐍𝐎𝐍 È 𝐀𝐃𝐌𝐈𝐍 𝐅𝐑𝐀\n╰➤ Concedimi i privilegi di Amministratore per eseguire l\'operazione.',
        restrict: '🚫 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐄 𝐂𝐎𝐍 𝐋𝐔𝐂𝐂𝐇𝐄𝐓𝐓𝐎\n╰➤ Questa risorsa è stata sigillata globalmente.',
        disabled: '⛔ È 𝐃𝐈𝐒𝐀𝐓𝐓𝐈𝐕𝐀𝐓𝐎\n╰➤ L\'algoritmo di questo comando è stato disattivato dal nucleo.'
    }[type]
    if (msg) {
        conn.reply(m.chat, msg, m, global.rcanal).catch(e => console.error('[ERRORE] Dfail fallito:', e))
    }
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => { 
    unwatchFile(file)     
    console.log(chalk.bgHex('#b91c1c')(chalk.white.bold(" ⚡ [DANGER SYSTEM] File: 'handler.js' Aggiornato ed Iniettato ")))
})
