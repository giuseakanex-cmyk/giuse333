
const RAPID_KEY = "c9d9e589b3mshc7eecec96ccc03ep126bb1jsnbd4082441abd"
const NF_HOST = "netflix54.p.rapidapi.com"

async function fetchNF(endpoint) {
  try {
    const res = await fetch(`https://${NF_HOST}/${endpoint}`, {
      headers: {
        "x-rapidapi-key": RAPID_KEY,
        "x-rapidapi-host": NF_HOST
      }
    })
    return await res.json()
  } catch (e) { return null }
}

function getTypeEmoji(type) {
  if (!type) return "🎬"
  if (type === "show") return "📺"
  return "🎬"
}

function getTipoLabel(type) {
  if (!type) return "N/D"
  if (type === "show") return "Serie TV"
  if (type === "movie") return "Film"
  return type
}

let handler = async (m, { conn, args }) => {
  const chat = m.chat
  const cmd = args[0]?.toLowerCase()

  if (!cmd) {
    return m.reply(
`╭──────────────────╮
┃ 🎬 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐍𝐄𝐓𝐅𝐋𝐈𝐗
┃━━━━━━━━━━━━━━━━━━
┃ *.netflix cerca [titolo]*
┃ → cerca film o serie
┃
┃ *.netflix info [titolo]*
┃ → trama, cast, generi, rating
┃
┃ *.netflix episodi [titolo]*
┃ → lista episodi serie
╰──────────────────╯`)
  }

  if (cmd === "cerca") {
    const titolo = args.slice(1).join(" ")
    if (!titolo) return m.reply("❌ Specifica un titolo!\nEs: *.netflix cerca Stranger Things*")

    await m.reply(`🔍 Cerco *${titolo}* su Netflix...`)

    const data = await fetchNF(`search/?query=${encodeURIComponent(titolo)}&offset=0&limit=10&lang=en`)
    if (!data?.titles?.length) return m.reply("❌ Nessun risultato trovato.")

    let testo = `╭──────────────────╮\n┃ 🔍 RISULTATI: *${titolo}*\n┃━━━━━━━━━━━━━━━━━━\n`

    for (let item of data.titles.slice(0, 8)) {
      const id = item.summary?.id
      const tipo = item.summary?.type
      const emoji = getTypeEmoji(tipo)
      const nome = item.jawSummary?.title || item.title || "N/D"
      const generi = item.jawSummary?.genres?.map(g => g.name).join(", ") || "N/D"
      const rating = item.jawSummary?.maturity?.rating?.value || ""
      testo += `┃\n┃ ${emoji} *${nome}*\n┃ ${getTipoLabel(tipo)} | ${rating}\n┃ 🎭 ${generi}\n┃ 🆔 ${id}\n`
    }

    testo += `┃\n┃━━━━━━━━━━━━━━━━━━\n┃ Usa *.netflix info [titolo]*\n╰──────────────────╯`
    return conn.sendMessage(chat, { text: testo }, { quoted: m })
  }

  if (cmd === "info") {
    const titolo = args.slice(1).join(" ")
    if (!titolo) return m.reply("❌ Specifica un titolo!\nEs: *.netflix info Breaking Bad*")

    await m.reply(`🔍 Cerco info su *${titolo}*...`)

    const search = await fetchNF(`search/?query=${encodeURIComponent(titolo)}&offset=0&limit=3&lang=en`)
    if (!search?.titles?.length) return m.reply("❌ Nessun risultato trovato.")

    const item = search.titles[0]
    const jaw = item.jawSummary
    const id = item.summary?.id

    const nome = jaw?.title || "N/D"
    const tipo = item.summary?.type
    const emoji = getTypeEmoji(tipo)
    const trama = jaw?.contextualSynopsis?.text || "N/D"
    const generi = jaw?.genres?.map(g => g.name).join(", ") || "N/D"
    const cast = jaw?.cast?.slice(0, 6).map(c => c.name).join(", ") || "N/D"
    const creators = jaw?.creators?.map(c => c.name).join(", ") || ""
    const directors = jaw?.directors?.map(d => d.name).join(", ") || ""
    const rating = jaw?.maturity?.rating?.value || "N/D"
    const ratingDesc = jaw?.maturity?.rating?.specificRatingReason || ""
    const tags = jaw?.tags?.map(t => t.name).join(", ") || ""
    const isOriginal = item.summary?.isOriginal ? "🔴 Netflix Original" : ""

    let testo =
`╭──────────────────╮
┃ ${emoji} 𝐈𝐍𝐅𝐎 𝐍𝐄𝐓𝐅𝐋𝐈𝐗
┃━━━━━━━━━━━━━━━━━━
┃ *${nome}* ${isOriginal}
┃ ${getTipoLabel(tipo)} | 🔞 ${rating}
┃━━━━━━━━━━━━━━━━━━
┃ 📝 *Trama:*
┃ ${trama.slice(0, 300)}${trama.length > 300 ? "..." : ""}
┃━━━━━━━━━━━━━━━━━━
┃ 🎭 *Generi:* ${generi}
${tags ? `┃ 🏷 *Tags:* ${tags}\n` : ""}${creators ? `┃ 🎬 *Creatore:* ${creators}\n` : ""}${directors ? `┃ 🎬 *Regia:* ${directors}\n` : ""}┃ 👥 *Cast:* ${cast}
┃━━━━━━━━━━━━━━━━━━
┃ ⚠️ ${ratingDesc}
┃ 🆔 ID: ${id}
╰──────────────────╯`

    return conn.sendMessage(chat, { text: testo }, { quoted: m })
  }

  if (cmd === "episodi") {
    const titolo = args.slice(1).join(" ")
    if (!titolo) return m.reply("❌ Specifica una serie!\nEs: *.netflix episodi Squid Game*")

    await m.reply(`🔍 Cerco episodi di *${titolo}*...`)

    const search = await fetchNF(`search/?query=${encodeURIComponent(titolo)}&offset=0&limit=3&lang=en`)
    if (!search?.titles?.length) return m.reply("❌ Serie non trovata.")

    const item = search.titles[0]
    const id = item.summary?.id
    const nome = item.jawSummary?.title || titolo

    if (item.summary?.type !== "show") return m.reply(`❌ *${nome}* è un film, non ha episodi.`)

    const data = await fetchNF(`season/episodes/?ids=${id}&offset=0&limit=30&lang=en`)
    if (!data?.[0]?.episodes?.length) return m.reply("❌ Episodi non disponibili per questa serie.")

    const episodi = data[0].episodes
    let testo = `╭──────────────────╮\n┃ 📺 *${nome}*\n┃━━━━━━━━━━━━━━━━━━\n`

    let currentStagione = ""
    for (let ep of episodi) {
      const stagione = ep.season ? `Stagione ${ep.season}` : ""
      const numEp = ep.episode || "?"
      const titoloEp = ep.title || "N/D"
      const durata = ep.runtime ? `${ep.runtime}min` : ""

      if (stagione && stagione !== currentStagione) {
        currentStagione = stagione
        testo += `┃\n┃ 📂 *${stagione}*\n`
      }

      testo += `┃ *${numEp}.* ${titoloEp} ${durata ? `(${durata})` : ""}\n`
    }

    testo += `╰──────────────────╯`
    return conn.sendMessage(chat, { text: testo }, { quoted: m })
  }

  return m.reply(
`╭──────────────────╮
┃ 🎬 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐍𝐄𝐓𝐅𝐋𝐈𝐗
┃━━━━━━━━━━━━━━━━━━
┃ *.netflix cerca [titolo]*
┃ *.netflix info [titolo]*
┃ *.netflix episodi [titolo]*
╰──────────────────╯`)
}

handler.command = ["netflix"]
handler.before = async () => false
export default handler

