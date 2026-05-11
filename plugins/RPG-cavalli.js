let handler = async (m, { conn, args, command }) => {

  global.cavalli = global.cavalli || {}

  let user = global.db.data.users[m.sender]
  if (!user) global.db.data.users[m.sender] = { money: 0 }

  if (command === "cavalli") {
    let money = user.money || 0

    const bet = (x) => {
      if (money < x) return `no_money`
      return `.cavalliplay ${x}`
    }

    return conn.sendMessage(m.chat, {
      text:
`╔═🐎 𝐂𝐀𝐕𝐀𝐋𝐋𝐈 ═╗
┃ 💰 Portafoglio: *${money}€*
┃
┃ Scegli la puntata
╚══════╝`,
      buttons: [
        { buttonId: bet(100), buttonText: { displayText: "100€" }, type: 1 },
        { buttonId: bet(200), buttonText: { displayText: "200€" }, type: 1 },
        { buttonId: bet(500), buttonText: { displayText: "500€" }, type: 1 },
        { buttonId: bet(1000), buttonText: { displayText: "1000€" }, type: 1 },
        { buttonId: bet(10000), buttonText: { displayText: "10000€" }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (command === "cavalliplay") {

    let bet = parseInt(args[0])

    if (!bet || bet < 50) return m.reply("💸 Puntata minima 50€")
    if (user.money < bet) return m.reply(`💸 Devi avere almeno ${bet}€`)

    global.cavalli[m.sender] = { bet }

    return conn.sendMessage(m.chat, {
      text:
`╔═🐎 𝐂𝐀𝐕𝐀𝐋𝐋𝐈 ═╗
┃ 🎯 Scegli il cavallo
┃ 💰 Puntata: *${bet}€*
┃
┃ 🐎 1 → Jonny
┃ 🐎 2 → Gab
┃ 🐎 3 → Franco
╚══════╝`,
      buttons: [
        { buttonId: ".cavallo 1", buttonText: { displayText: "🐎 Jonny" }, type: 1 },
        { buttonId: ".cavallo 2", buttonText: { displayText: "🐎 Gab" }, type: 1 },
        { buttonId: ".cavallo 3", buttonText: { displayText: "🐎 Franco" }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (command === "cavallo") {

    let scelta = parseInt(args[0])
    let game = global.cavalli[m.sender]

    if (!game) return m.reply("❌ Devi prima fare .cavalli")

    let cavalli = {
      1: "Jonny",
      2: "Gab",
      3: "Franco"
    }

    if (![1,2,3].includes(scelta)) return m.reply("❌ Scelta non valida")

    let vincitore = Math.floor(Math.random() * 3) + 1
    let nomeVincitore = cavalli[vincitore]

    let text

    if (scelta === vincitore) {
      user.money += game.bet * 2
      text =
`╔═🐎 𝐂𝐀𝐕𝐀𝐋𝐋𝐈 ═╗
┃ 🏆 Vincitore: *${nomeVincitore}*
┃ 💰 Guadagno: +${game.bet * 2}€
┃
┃ 💼 Saldo: ${user.money}€
╚══════╝`
    } else {
      user.money -= game.bet
      text =
`╔═🐎 𝐂𝐀𝐕𝐀𝐋𝐋𝐈 ═╗
┃ 🏆 Vincitore: *${nomeVincitore}*
┃ 💀 Perso: -${game.bet}€
┃
┃ 💼 Saldo: ${user.money}€
╚══════╝`
    }

    delete global.cavalli[m.sender]

    return conn.sendMessage(m.chat, {
      text,
      buttons: [
        { buttonId: ".cavalli", buttonText: { displayText: "🔁 Gioca di nuovo" }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })
  }

}

handler.command = /^(cavalli|cavalliplay|cavallo)$/i

export default handler