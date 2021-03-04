const rp = require('request-promise')

const { faucetAddress, claimValue, claimPeriod } = require('../config/config-bot.json')
const { Users } = require('../models')
const { numberFormat, parseBal } = require('../utils.js')
const sendCoins = require('../sendCoins')

const API = 'https://api.semux.online/v2.1.0/'

const doClaim = async (authorId, msg) => {
  const faucetBal = JSON.parse(await rp(API + 'account?address=' + faucetAddress))
  if (!faucetBal.success) return msg.channel.send("Cannot get faucet balance, try later")
  const faucetAvailable = numberFormat(parseBal(faucetBal.result.available))
  if (faucetAvailable < (claimValue+0.005)) return msg.reply("Cannot claim, faucet address dont have enough coins.")

  const userData = await Users.findOne({ where: {discord_id: authorId }})
  if (!userData) return msg.reply("Sorry, but you don't have account to claim, type **/getAddress** first.")

  if (userData.lastClaim) {
    if (userData.lastClaim > (Date.now()-claimPeriod*60*60*1000)) return msg.reply("Sorry, but you cannt claim now, try later.")
  }
  
  await sendCoins(null, userData.address, String(claimValue), msg, "claim")

  await Users.update({
    lastClaim: Date.now()
  }, { where: {discord_id: authorId }})

  return msg.reply("Cool, you got some free coins, see you later.")
}

module.exports = doClaim
