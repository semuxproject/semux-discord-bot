const { Users, sequelize } = require('./models')
const rp = require('request-promise')
const Long = require('long')

const { toHexString, parseBal, hexBytes } = require('./utils.js')
const { Network, TransactionType, Transaction, Key } = require('semux-js')

const API = 'https://api.semux.online/v2.1.0/'
const FEE = 5000000

async function getAddress (address) {
  return JSON.parse(await rp(API + 'account?address=' + address))
}

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


module.exports = sendCoins