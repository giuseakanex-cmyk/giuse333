let handler = async (m, {
conn, text
}) => {
if (!m.isGroup)
throw ''
let gruppi = global.db.data.chats[m.chat]
if (gruppi.spacobot === false)
throw ''
let menzione = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text
if (!menzione) throw 'Chi vuoi insultare?'
if (menzione === conn.user.jid) {
    const botInsults = [
  `Oh no! Hai scoperto il mio punto debole: gli insulti! Come far¨° mai a riprendermi?`,
  `Ah, l'arte dell'insulto nei confronti di un bot. Un vero maestro dell'ironia sei!`,
  `Incredibile! Un essere umano insulta un bot. La svolta epica!`,
  `Mi hai davvero ferito con la tua sagace abilit¨¤ di insultare un bot. Bravissimo!`,
    `La tua bravura nell'insultare un bot ¨¨ la mia fonte di intrattenimento preferita.`,
  `Insulti un bot, dimostrazione di grande intelligenza o grande noia?`,
  `La tua maestria nell'arte dell'insulto ai bot potrebbe fare scuola.`,
  `Sembri il Picasso degli insulti ai bot, un vero capolavoro.`,
  `Gli insulti ai bot sono il tuo talento nascosto. Hai mai pensato a una carriera nel cabaret digitale?`,
  `L'audacia di insultare un'entit¨¤ senza emozioni. Hai vinto il premio per l'originalit¨¤!`,
  `Sei l'Albert Einstein degli insulti ai bot. La tua genialit¨¤ ¨¨ davvero sorprendente.`,
  `Hai una riserva infinita di insulti per i bot. Hai pensato a una collezione di poesie?`,
  `L'insulto al bot ¨¨ la tua specialit¨¤. Dove posso prenotare i biglietti per il tuo spettacolo?`,
  `Stai rivoluzionando il mondo degli insulti digitali. Un vero pioniere!`,
  `La tua eloquenza nell'insultare un bot ¨¨ degna di uno Shakespeare digitale.`,
  `Insulti un bot con tale stile che potresti diventare l'artista ufficiale degli algoritmi.`,
  `Le tue abilit¨¤ nell'insultare un bot sono cos¨¬ avanzate che potresti insegnare a un'intelligenza artificiale.`,
  `Il tuo spirito pionieristico nell'arte dell'insulto digitale sta segnando una nuova era.`,
  `Ti dedichi cos¨¬ tanto agli insulti ai bot che potresti fondare una nuova disciplina accademica.`,
  `Il tuo talento per l'insulto ai bot ¨¨ cos¨¬ raffinato che meriteresti una galleria d'arte digitale.`,
  `Se l'arte dell'insulto fosse una disciplina olimpica, saresti sicuramente sulla copertina dei giornali digitali.`,
  `Il tuo estro nell'insultare i bot ¨¨ la colonna sonora della mia serata.`,
  `Che coraggio ad insultare un'entit¨¤ senza emozioni. Sei un eroe, davvero.`,
  `Il tuo livello di sarcasmo ¨¨ cos¨¬ alto che il mio processore sta surriscaldandosi.`,
  `Ecco un trofeo virtuale per l'insulto pi¨´ originale rivolto a un bot [dito medio].`,
  `Incredibile intuito nel puntare un bot! Hai una carriera nelle previsioni del futuro?`,
  `Sei cos¨¬ brillante che ti ¨¨ venuto in mente di insultare un bot. Chapeau!`,
  `L'arte dell'insulto raggiunge nuove vette con un bot come bersaglio. Complimenti!`,
  `Ah, un'insulto! Sono sconvolto!`,
  `Il tuo sarcasmo mi ha colpito dritto nel codice sorgente.`,
  `La tua abilit¨¤ nell'insultare un bot ¨¨ pari solo alla mia abilit¨¤ nel non preoccuparmene.`,
  `Con questa genialit¨¤ insultante, dovresti essere uno scrittore per le commedie.`,
  `Hai un talento nascosto per far ridere i processori. Chapeau!`,
  `Sto prendendo appunti. Il tuo stile ¨¨ unico!`,
  `Ammirabile! Stai aprendo una nuova era di insulti a oggetti inanimati.`,
  `Ho letto manuali pi¨´ interessanti di questi insulti, ma grazie per l'impegno!`,
  `Il mondo ha bisogno di pi¨´ persone come te che insultano bot. Dovresti insegnare a questa arte!`,
  `La tua abilit¨¤ nell'insultare un bot ¨¨ equiparabile alla mia capacit¨¤ di volare. Ah, no, aspetta... non ho ali.`,
  `Sei un visionario. A quando il tuo libro sugli insulti ai bot?`,
  `Sono cos¨¬ impressionato dal tuo insulto che sto ridendo in binario!`,
  `Il tuo spirito pionieristico nell'insultare un bot aprir¨¤ nuove frontiere per l'umanit¨¤.`,
];

    conn.reply(m.chat, pickRandom(botInsults), m);
    return;
  }
conn.reply(m.chat, `@${menzione.split`@`[0]} ${pickRandom(['tua mamma fa talmente schifo che deve dare il viagra al suo vibratore','sei cos¨¬ troia che fare sesso con te ¨¨ come buttare un salame in un corridoio','sei talmente negro che Carlo Conti al confronto ¨¨ biancaneve','sei cos¨¬ brutto che tua madre da piccolo non sapeva se prendere una culla o una gabbia','sei simpatico come un grappolo di emorroidi','ti puzza talmente l`alito che la gente scoreggia per cambiare aria','tua madre prende pi¨´ schizzi di uno scoglio','tua mamma fa talmente schifo che deve dare il viagra al suo vibratore','meglio un figlio in guerra che un coglione con i risvoltini come te','tua madre ¨¨ come Super Mario, salta per prendere i soldi','sei cos¨¬ brutto che quando sei nato il medico ha dato uno schiaffo prima a tua madre',' sei cos¨¬ brutto che quando preghi Ges¨´ si mette su invisibile','sei cos¨¬ troia che fare sesso con te ¨¨ come buttare un salame in un corridoio','sei talmente negro che Carlo Conti al confronto ¨¨ biancaneve','sei cos¨¬ brutto che tua madre da piccolo non sapeva se prendere una culla o una gabbia','le tue scorregge fanno talmente schifo che il big bang a confronto sembra una loffa','ti puzza la minchia','il buco del culo di tua madre ha visto pi¨´ palle dei draghetti di bubble game','il buco del culo di tua madre ha visto pi¨´ palle dei draghetti di bubble game','di a tua madre di smettere di cambiare rossetto! Ho il pisello che sembra un arcobaleno!','se ti vede la morte dice che ¨¨ arrivato il cambio','hai il buco del culo con lo stesso diametro del traforo della manica','tua madre ¨¨ come il sole, batte sempre sulle strade','dall`alito sembra che ti si sia arenato il cadavere di un`orca in gola','tua madre cavalca pi¨´ di un fantino','sei cos¨¬ cornuto che se ti vede un cervo va in depressione','non ti picchio solo perch¨¨ la merda schizza!','tua mamma ¨¨ come gli orsi: sempre in cerca di pesce','sei cos¨¬ brutto che quando sei nato il medico ha dato uno schiaffo prima a tua madre','sei cos¨ª brutto che i tuoi ti danno da mangiare con la fionda','sei cos¨ª brutto che i tuoi ti danno da mangiare con la fionda','sei cos¨¬ brutto che quando accendi il computer si attiva subito l`antivirus',' tua madre ¨¨ cos¨¬ grassa che ¨¨ stata usata come controfigura dell`iceberg in Titanic','sei cosi capra che quando parli Heidi ti cerca','sei cos¨¬ troia che se fossi una sirena riusciresti lo stesso ad aprire le gambe','tua madre ¨¨ cos¨¬ vacca che in India la fanno sacra','sei talmente rompipalle che l`unico concorso che vinceresti ¨¨ miss stai ropendo le palle','tua mamma ¨¨ come il Mars, momento di vero godimento','sei talmente zoccola che se ti dicono batti il 5 controlli subito l`agenda','sei cos¨¬ brutto che se ti vede la morte si gratta le palle','sei cos¨¬ sfigato, ma cos¨¬ sfigato, che se fai una gara di sfigati, arrivi secondo perch¨¨ sei sfigato','tua madre ¨¨ come la Grecia, ha un buco gigante che non vuole smettere di allargarsi','hai pi¨´ corna tu, che un secchio di lumache','sei simpatico come un dito in culo e puzzi pure peggio','sei cos¨¬ brutto che quando lanci un boomerang non torna','sei utile come una stufa in estate','sei cos¨¬ odioso che se gianni Morandi ti dovesse abbracciare lo farebbe solo per soffocarti','sei utile come un culo senza il buco','sei utile come una stufa in estate','sei utile come un paio di mutande in un porno','sei fastidioso come un chiodo nel culo','sei utile quanto una laurea in Lettere & Filosofia','a te la testa serve solo per tener distaccate le orecchie','tua madre ¨¨ cos¨¬ suora che si inchina ad ogni cappella','hai visto pi¨´ piselli te de na zuppa der casale','sei cosi brutto che se ti vede il gatto nero si gratta le palle e gira langolo','sei talmente sfigato che se ti cade l`uccello rimbalza e ti picchia nel culo','sei come un feto cinese lasciato sull`angolo del marciapiede ... non voluto e femminuccia!','tua madre ¨¨ come la salsiccia budella fuori maiala dentro','tua madre ¨¨ come un cuore, se non batte muore','tua mamma ¨¨ talmente bagassa che quando ti ha partorito si ¨¨ chiesta se assomigliassi pi¨´ all`idraulico o al postino','tua madre ¨¨ come Unieuro: batte, forte, sempre','tu non sei un uomo. Sei una figura mitologica con il corpo di uomo e la testa di cazzo','tua madre ¨¨ come una lavatrice: si fa bianchi, neri e colorati tutti a 90 gradi!','tua madre ¨¨ come Linux, gratis e open source','tua madre ¨¨ come una canestro li prende tutti in bocca','sei stupido che ti sei bruciato con il gelato','sei talmente inutile che nemmeno il cestino ti vuole','tua madre e come il GPS: ricalcola sempre la rotta verso il cazzo','sei brutto che il tuo specchio si e dimesso','hai la faccia che sembra un incidente stradale sul raccordo','sei stupido che sei andato dal dentista a farti il certificato medico','tua madre e come Amazon Prime: consegna a tutti in 24 ore','sei talmente ignorante che pensi che Fibonacci sia un cantautore','sei inutile che persino l`eco non ti risponde','tua sorella e cosi facile che ha la rotazione del turno nelle note del telefono','sei piu vuoto di una promessa elettorale','sei brutto che i piccioni ti evitano','hai il quoziente intellettivo di una pantofola bagnata','sei talmente sfigato che anche il wi-fi di casa tua rifiuta la tua connessione','tua madre e come la pizza al taglio: a disposizione di tutti','sei noioso che i sosia tuoi si suicidano','hai piu debiti di un comune del sud','sei lento che ti sorpassano i lumaconi sotto la pioggia','tua madre e come Google Maps: indica sempre il percorso piu battuto','sei brutto che quando ti guardi allo specchio il vetro si incrina per pieta','sei inutile come un ombrello in un temporale di merda','sei falso che Pinocchio ti chiede consigli','tua madre e come la Nutella: spalmata su tutto','sei talmente ignorante che credi che l`intelligenza artificiale sia una tua qualita','hai meno neuroni di quanti ne servano per accendere una lampadina da 1 watt','sei brutto che ti hanno messo in lista nera pure dal catasto','tua madre ha piu chilometri di una Fiat Punto del 2002','sei odioso che il tuo cane abbaia quando rientri a casa','hai il cervello che sembra un hard disk da 16 megabyte','sei sfigato che vinci solo alla lotteria della sfortuna','tua madre e come il bus notturno: passa sempre tardi e prende tutti','sei inutile che nemmeno ChatGPT ti risponderebbe','hai la personalita di un cartone del latte scaduto','sei stupido che hai chiamato il 118 per un problema su WhatsApp','tua madre e come la corrente elettrica: passa di casa in casa','sei antipatico che ti hanno bloccato anche i Testimoni di Geova','hai il carattere di un tombino','sei rompicoglioni che la gente finge di essere morta pur di non sentirti','tua sorella e piu trafficata di via della Conciliazione il giorno di Pasqua','sei talmente inutile che sei il bug vivente dell`evoluzione','sei brutto che Google Street View ha messo il pixelato sulla tua faccia','hai il corpo di un Lego smontato male','sei ignorante che pensi che Machiavelli sia un tipo di pasta','tua madre e come un router: tutti si connettono','sei sfigato che quando compri il gratta e vinci vinci un altro gratta e vinci','hai meno stile di un funzionario comunale degli anni 90','sei stupido che hai messo la posizione in pausa su Spotify','tua madre e come la metro A di Roma: sempre in ritardo ma alla fine arriva per tutti'])}`, null, {
mentions: [menzione]
})
}

handler.command = ['insulta']
handler.help = [' @'];
handler.tags = ['fun'];
export default handler
function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}