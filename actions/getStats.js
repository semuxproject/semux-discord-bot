const rp = require('request-promise')

const { getPriceInSats, getAllStats, getCommits, getPrice, numberToString, } = require('../utils.js')
const API = 'https://api.semux.online/v2.1.0/'

const getStats = async (msg) => {
  const price = getPrice()
  try {
    var { result } = JSON.parse(await rp(API + 'info'))
  } catch (e) {
    return msg.channel.send('Lost connection with API server')
  }
  if (result) {
    let stats = getAllStats()
    return msg.channel.send(
      `Semux Last Block: **${numberToString(result.latestBlockNumber)}**\n` +
      `Pending Txs: **${result.pendingTransactions}**\n` +
      `SEM price: **$${price} USD** (${getPriceInSats()} sats)\n` +
      `Marketcap: $${numberToString(stats.marketCap)} USD\n` +
      `Circulating supply: ${numberToString(stats.circulatingSupply)} SEM\n` +
      `Yearly ROI of validator: **${stats.validatorRoi}%**\n` +
      `Total transactions: **${numberToString(stats.totalTransactions)} Txs**\n` +
      `Total addresses: **${numberToString(stats.totalAddresses)}**\n` +
      `Blockchain size: **${stats.blockchainSize}**\n` +
      `Commits in last 4 weeks: **${getCommits()}**\n`
    )
  }
}

module.exports = getStats
