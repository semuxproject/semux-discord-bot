const Discord = require('discord.js')
const { Network, TransactionType, Transaction, Key } = require('semux-js')
const Long = require('long')
const rp = require('request-promise')
const botSettings = require('./config/config-bot.json')
const allowedCommands = require('./config/allowed-commands.json')
const {  parseBal } = require('./utils.js')
const { scanNewBlock } = require('./alerts.js')
const { Users, sequelize } = require('./models')

const getTop = require('./actions/getTop')
const getStats = require('./actions/getStats')
const getBalance = require('./actions/getBalance')

const prefix = botSettings.prefix
const bot = new Discord.Client({ disableEveryone: true })

const API = 'https://api.semux.online/v2.1.0/'
const FEE = 5000000

bot.on('ready', () => {
  console.log('Bot is connected.')
})

async function getAddress (address) {
  return JSON.parse(await rp(API + 'account?address=' + address))
}

async function sendToApi (tx) {
  const serialize = Buffer.from(tx.toBytes().buffer).toString('hex')
  try {
    var { result } = await rp({
      method: 'POST',
      uri: `${API}transaction/raw?raw=${serialize}&validateNonce=true`,
      json: true
    })
  } catch (e) {
    console.log(e)
  }
  if (result) {
    return result
  }
}
// TO DO, move to separate file
async function sendCoins (authorId, toAddress, value, msg, comment) {
  let hexString = '0x746970' // default "tip"
  if (comment) {
    let bytesArray = Buffer.from(comment)
    hexString = '0x' + toHexString(bytesArray)
  }
  if (!toAddress || !value) {
    return {
      error: true,
      reason: 'Amount of SEM and Discord Username are required.'
    }
  }
  const from = await Users.findOne({ where: { discord_id: authorId } })
  if (!from) {
    return {
      error: true,
      reason: "You don't have account yet, type /getAddress first."
    }
  }
  var isFrom = await getAddress(from.address)
  try {
    await getAddress(toAddress)
  } catch (e) {
    return { error: true, reason: 'Wrong recipient, try another one.' }
  }
  if (value.includes(',')) value = value.replace(/,/g, '.')
  let amount = parseFloat(value)
  if (!amount) return { error: true, reason: 'Amount is not correct.' }
  amount = amount * Math.pow(10, 9)
  if (amount < 0.000000001) return { error: true, reason: 'Wrong amount, try another one.' }
  // check reciever balance before transfer
  const fromAddressBal = await getAddress(from.address)
  let nonce = parseInt(isFrom.result.nonce, 10) + parseInt(isFrom.result.pendingTransactionCount, 10)
  const available = parseFloat(fromAddressBal.result.available)
  if (available === amount) {
    amount = amount - FEE
  }
  if (available < (amount + FEE)) {
    return { error: true, reason: `Insufficient balance, you have **${parseBal(available)} SEM**` }
  }
  const privateKey = Key.importEncodedPrivateKey(hexBytes(from.private_key))
  try {
    var tx = new Transaction(
      Network.MAINNET,
      TransactionType.TRANSFER,
      hexBytes(toAddress), // to
      Long.fromNumber(amount), // value
      Long.fromNumber(FEE), // fee
      Long.fromNumber(nonce), // nonce
      Long.fromNumber(new Date().getTime()), // timestamp
      hexBytes(hexString) // data
    ).sign(privateKey)
  } catch (e) {
    console.log(e)
  }
  let hash = await sendToApi(tx)

  if (!hash) {
    return { error: true, reason: 'Error while tried to create transaction.' }
  } else {
    return { error: false, hash }
  }
}

async function changeStats (senderId, recieverId, value) {
  if (value.includes(',')) value = value.replace(/,/g, '.')
  let amount = parseFloat(value)
  let sender = await Users.findOne({ where: { discord_id: senderId } })
  let reciever = await Users.findOne({ where: { discord_id: recieverId } })
  await sender.update({
    sent: sender.sent + amount
  })
  await reciever.update({
    received: reciever.received + amount
  })
}

bot.on('message', async msg => {
  // replace double whitespaces with a single one
  msg.content = msg.content.toString().replace(/  +/g, ' ')
  const args = msg.content.trim().split(' ')
  const authorId = msg.author.id

  if (allowedCommands[args[0]]) {
    console.log(`[${new Date()}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`)
  }

  switch (msg.content.toLocaleLowerCase()) {
    case `${prefix}topdonators`:
      const topDonators = await getTop('sent')
      return msg.channel.send(topDonators)
    
    case `${prefix}toprecipients`:
      const topRecipients = await getTop('received')
      return msg.channel.send(topRecipients)
    

    case `${prefix}stats`: 
      await getStats(msg)
      return

    case `${prefix}help`:
      return msg.channel.send(`SemuxBot commands:\n` +
      `**${prefix}balance** - show your balance.\n` +
      `**${prefix}tip** *<@username>* *<amount>* *<'comment'>*- send SEM to a Discord user.\n` +
      `**${prefix}withdraw** *<address>* *<amount>* - withdraw SEM to your personal address.\n` +
      `**${prefix}getAddress** - get your personal deposit/tips address.\n` +
      `**${prefix}topDonators** - show the most active donators.\n` +
      `**${prefix}topRecipients** - show the luckiest recipients.\n` +
      `**${prefix}rain** *<amount>* - gives all online users a portion of sem.\n` +
      `**${prefix}faucet** *<amount>* - donate sem to faucet address.\n` +
      `**${prefix}claim** - claim 1 sem if faucet address has it. *(works once a day)*\n` +
      `**${prefix}stats** - show current Semux network stats.`
    )
  }

  // balance
  if (msg.content.startsWith(`${prefix}balance`) || msg.content.startsWith(`${prefix}bal`)) {
    await getBalance(msg, authorId)
    return 
  }

  // tip to username
  if (msg.content.startsWith(`${prefix}tip `)) {
    let comment = ''
    const amount = args[2]
    const username = args[1]
    if (args[3] && args[3].includes("'")) {
      try {
        comment = msg.content.trim().match(/'([^']+)'/)[1]
      } catch (e) {
        return msg.reply('Close quotes please')
      }
    }

    let usernameId = username
    if (username.includes('@')) {
      usernameId = username.substring(2, username.length - 1)
      usernameId = usernameId.replace('!', '')
    }
    console.log(`Tipping to ${usernameId}`)
    let userAddress = await Users.findOne({ where: { discord_id: usernameId } })
    if (!userAddress) {
      const newUserName = bot.users.find(user => user.id === usernameId)
      if (!newUserName) {
        console.log('Cannot find this user on the server. Aborting.')
        return msg.reply('Cannot find this user on the server.')
      }
      console.log('Recipient doesn\'t have public address yet. Generating new key pair.')
      const key = Key.generateKeyPair()
      const privateKey = toHexString(key.getEncodedPrivateKey())
      const address = '0x' + key.toAddressHexString()
      var newRegister = await Users.create({
        username: newUserName.username,
        discord_id: usernameId,
        address: address,
        private_key: privateKey
      })
      userAddress = newRegister.address
    } else {
      userAddress = userAddress.address
    }
    let reciever = bot.users.find(user => user.id === usernameId)
    if (!reciever) return msg.reply('Cannot find this user on the server.')
    try {
      var trySend = await sendCoins(authorId, userAddress, amount, msg, comment)
    } catch (e) {
      // console.log(e)
    }
    if (trySend.error) return msg.reply(trySend.reason)
    await changeStats(authorId, usernameId, amount)
    try {
      await reciever.send(`You've received tips. TX: <https://semux.info/explorer/transaction/${trySend.hash}> \nSend me: \`/balance\` or \`/help\` to find more details`)
    } catch (e) {
      console.error(e)
    }
    await msg.reply(`Tip sent. TX: <https://semux.info/explorer/transaction/${trySend.hash}>`)
  }

  // get donate address
  if (msg.content.toLowerCase().startsWith(`${prefix}getaddress`) || msg.content.toLowerCase().startsWith(`${prefix}address`)) {
    const user = await Users.findOne({ where: { discord_id: authorId } })
    if (!user) {
      const key = Key.generateKeyPair()
      const privateKey = toHexString(key.getEncodedPrivateKey())
      const address = '0x' + key.toAddressHexString()
      if (address) {
        let text = `This is your unique deposit address: **${address}**\n
        You can deposit some SEM to this address and use your coins for tipping.\n
        People will be tipping to this address too. Try to be helpful to the community ;)
        `
        try {
          await msg.author.send(text)
        } catch (e) {
          console.error(e)
          msg.channel.send(text)
        }
        await Users.create({
          username: msg.author.username,
          discord_id: authorId,
          address: address,
          private_key: privateKey
        })
      }
    } else {
      let text = `Your deposit address is: **${user.address}**`
      try {
        await msg.author.send(text)
      } catch (e) {
        console.error(e)
        msg.channel.send(text)
      }
    }
  }

  // withdraw
  if (msg.content.startsWith(`${prefix}withdraw`)) {
    const amount = args[2]
    const toAddress = args[1]
    let trySend
    try {
      trySend = await sendCoins(authorId, toAddress, amount, msg)
    } catch (e) {
      // console.log(e)
    }
    let responseToWithdrawal = 'Your withdrawal request has been processed successfully.'
    if (trySend.error) {
      responseToWithdrawal = trySend.reason
    }
    try {
      await msg.author.send(responseToWithdrawal)
    } catch (e) {
      console.error(e)
    }
  }


})

setInterval(async function () {
  result = await scanNewBlock()
  if (result.error) {
    return
  }
  const channel = bot.channels.find(c => c.name === 'trading')
  for (let tx of result.transfers) {
    if (tx.type === 'deposited') {
      channel.send(`**[whale alert]** ${tx.value} SEM ${tx.type} to ${tx.exchange} :inbox_tray:`)
    } else {
      channel.send(`**[whale alert]** ${tx.value} SEM ${tx.type} from ${tx.exchange} :outbox_tray:`)
    }
  }
}, 5 * 1000)


function hexBytes (s) {
  return Buffer.from(s.replace('0x', ''), 'hex')
}

function toHexString (byteArray) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2)
  }).join('')
}

bot.login(botSettings.token)
