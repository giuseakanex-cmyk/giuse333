import { promises } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

export async function before(m, { conn, participants }) {
  if (!m.isGroup) return;
  
  let chat = global.db.data.chats[m.chat];
  if (!chat.welcome) return;
  
  let groupMetadata = await conn.groupMetadata(m.chat) || (conn.chats[m.chat] || {}).metadata;
  let participants_new = m.messageStubParameters;
  
  for (let user of participants_new) {
    let profilePic;
    try {
      profilePic = await conn.profilePictureUrl(user, 'image');
    } catch (e) {
      profilePic = 'https://telegra.ph/file/8ca14ef9fa43e99d1d196.jpg';
    }
    
    let ppBuffer;
    try {
      ppBuffer = await (await fetch(profilePic)).buffer();
    } catch (e) {
      ppBuffer = await (await fetch('https://telegra.ph/file/8ca14ef9fa43e99d1d196.jpg')).buffer();
    }
    
    if (m.messageStubType === 27) {
      let welcomeText = chat.sWelcome || `@${user.split('@')[0]} 𝐞̀ 𝐞𝐧𝐭𝐫𝐚𝐭𝐨 𝐧𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨`;

      welcomeText = welcomeText
        .replace(/@user/g, `@${user.split('@')[0]}`)
        .replace(/@group/g, groupMetadata.subject)
        .replace(/@count/g, groupMetadata.participants.length)
        .replace(/@desc/g, groupMetadata.desc?.toString() || 'Nessuna descrizione');

      welcomeText += `\n\n👥 𝐌𝐞𝐦𝐛𝐫𝐢 𝐧𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨: ${groupMetadata.participants.length}`;

      await conn.sendMessage(m.chat, {
        text: welcomeText,
        contextInfo: {
          mentionedJid: [user],
          forwardingScore: 99,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363341274693350@newsletter',
            serverMessageId: '',
            newsletterName: global.nomebot || '333'
          },
          externalAdReply: {
            title: '𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐢 𝐛𝐞𝐧𝐯𝐞𝐧𝐮𝐭𝐨 👋',
            body: 'Vai al canale 333',
            mediaType: 1,
            thumbnail: ppBuffer,
            renderLargerThumbnail: false,
            sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h'
          }
        }
      }, { quoted: null });
    }
    
    if (m.messageStubType === 28) {
      let byeText = chat.sBye || `@${user.split('@')[0]} 𝐡𝐚 𝐥𝐚𝐬𝐜𝐢𝐚𝐭𝐨 𝐢𝐥 𝐠𝐫𝐮𝐩𝐩𝐨`;

      byeText = byeText
        .replace(/@user/g, `@${user.split('@')[0]}`)
        .replace(/@group/g, groupMetadata.subject)
        .replace(/@count/g, groupMetadata.participants.length);

      byeText += `\n\n👥 𝐌𝐞𝐦𝐛𝐫𝐢 𝐫𝐢𝐦𝐚𝐧𝐞𝐧𝐭𝐢: ${groupMetadata.participants.length}`;

      await conn.sendMessage(m.chat, {
        text: byeText,
        contextInfo: {
          mentionedJid: [user],
          forwardingScore: 99,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363341274693350@newsletter',
            serverMessageId: '',
            newsletterName: global.nomebot || '333'
          },
          externalAdReply: {
            title: '𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐢 𝐚𝐝𝐝𝐢𝐨 👋',
            body: 'Vai al canale 333',
            mediaType: 1,
            thumbnail: ppBuffer,
            renderLargerThumbnail: false,
            sourceUrl: 'https://whatsapp.com/channel/0029VauhQviCsU9Ibrwlkb0h'
          }
        }
      }, { quoted: null });
    }
  }
}