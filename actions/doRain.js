const rp = require('request-promise')

const { Users } = require('../models')
const { numberFormat, parseBal } = require('../utils.js')
const sendCoins = require('../sendCoins')

const API = 'https://api.semux.online/v2.1.0/'

function getOnline (bot) {
	let onlineList = []
	let users = bot.users;
	users.keyArray().forEach((val) => {
		const userId = users.get(val).id
		const status = users.get(val).presence.status
		if (status == "online") {
			onlineList.push(userId.slice(0,-3))
		}
	})
	return onlineList
}

async function doRain (authorId, bot, value, msg) {
	const senderData = await Users.findOne({ where: { discord_id: authorId } })
	const userBal = JSON.parse(await rp(API + 'account?address=' + senderData.address))
	let availabeBal = 0
  if (userBal.success) {
		availabeBal = numberFormat(parseBal(userBal.result.available))
	} else {
		msg.channel.send("Cannot start /rain, server issue.")
		console.log("Cannot get user balance")
		return
	}

	const allUsers = await Users.findAll({ attributes: ['discord_id','address','username']})
	const onlineUsers = getOnline(bot)
	const validUsers = allUsers.filter(user => onlineUsers.includes(String(user.discord_id).slice(0, -3)))

	if (value.includes(',')) value = value.replace(/,/g, '.')
	let amount = parseFloat(value)
	
	if (availabeBal < (amount + validUsers.length*0.005)) {
		msg.channel.send('Wrong amount, try another one.')
		return
	}

	amount = amount/validUsers.length
	msg.channel.send(`It just **rained** on **${validUsers.length}** users. Check pm's.`)

	async function rainSend (addresses) {
		for (let user of addresses) {
			const id = String(user.discord_id).slice(0, -3)
			const address = user.address

			const reciever = bot.users.find(user => user.id.slice(0, -3) === id)
			const result = await sendCoins(authorId, address, String(amount), msg)
			if (!result.error) {
				reciever.send(`Hi ${user.username}, you are lucky man.\nTX: https://semux.info/explorer/transaction/${result.hash}`)
			}
		}
	}
	await rainSend(validUsers)
}

module.exports = doRain
