const rp = require('request-promise')

const { faucetAddress } = require('../config/config-bot.json')
const { Users } = require('../models')
const { numberFormat, parseBal } = require('../utils.js')
const sendCoins = require('../sendCoins')

const API = 'https://api.semux.online/v2.1.0/'

const doFaucet = async (authorId, bot, value, msg) => {
  const senderData = await Users.findOne({ where: { discord_id: authorId } })
	const userBal = JSON.parse(await rp(API + 'account?address=' + senderData.address))
	let availabeBal = 0
  if (userBal.success) {
		availabeBal = numberFormat(parseBal(userBal.result.available))
	} else {
		msg.channel.send("Cannot start /faucet, server issue.")
		console.log("Cannot get user balance")
		return
  }
  
  if (value.includes(',')) value = value.replace(/,/g, '.')
	let amount = parseFloat(value)
	
	if (availabeBal < (amount + 0.005)) {
		msg.channel.send('Wrong amount, try another one.')
		return
  }
  try {
    await sendCoins(authorId, faucetAddress, value, msg, "faucetDonate")
  } catch (e) {
    console.log(e)
    return msg.reply(e)
  }
  msg.channel.send(`Faucet coins sent, now everyone can use **!claim** ;)`)  
  return
}

module.exports = doFaucet
