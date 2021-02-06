const rp = require('request-promise')

const data = {
  priceUSD: 0,
  priceBTC: 0,
  commits: 0
}

function getPrice () {
  return parseFloat(data.priceUSD).toFixed(2)
}

function getPriceInSats () {
  return parseInt(data.priceBTC * 1e8, 10)
}

function getCommits () {
  return parseInt(data.commits, 10)
}

function getAllStats () {
  return data
}

async function updateGithubStats () {
  let requestOptions = {
    headers: {
      'User-Agent': 'Request-Promise'
    },
    uri: 'https://api.github.com/users/semuxproject/repos'
  }
  let repos
  try {
    repos = JSON.parse(await rp(requestOptions))
  } catch (e) {
    console.error(e)
    return console.error('Failed to update Github stats')
  }
  let totalCommits = 0
  for (let repo of repos) {
    requestOptions.uri = `https://api.github.com/repos/${repo.full_name}/stats/participation`
    let commits
    try {
      commits = JSON.parse(await rp(requestOptions))
    } catch (e) {
      console.error(e)
      return console.error('Failed to update Github stats')
    }
    /* sum of last 4 weeks out of 52 */
    if (commits.all.slice(48, 52).length) {
      totalCommits += commits.all.slice(48, 52).reduce((sum, currentVal) => sum + currentVal)
    }
  }
  data.commits = totalCommits
}

async function updateNetworkStats () {
  let stats
  try {
    stats = JSON.parse(await rp('https://semux.info/api/v1/network-stats'))
  } catch (e) {
    return console.error('Failed to update network stats')
  }
  data.totalTransactions = stats.total_transactions
  data.totalAddresses = stats.total_addresses
  data.validatorRoi = stats.validator_roi
  data.blockchainSize = stats.blockchain_size
  data.marketCap = stats.market_cap
  data.circulatingSupply = stats.current_supply
  data.maxSupply = stats.max_supply
}

async function updateStexPrice () {
  let stexPrice, btcUSD
  try {
    stexPrice = JSON.parse(await rp('https://api3.stex.com/public/ticker/575'))
  } catch (e) {
    return console.error('Failed to update stex price')
  }
  try {
    btcUSD = await getBtcPrice()
  } catch (e) {
    return console.error('Failed to get btcusd price')
  }
  data.priceBTC = parseFloat(stexPrice.data.last)
  data.priceUSD = data.priceBTC * btcUSD
}

async function getBtcPrice () {
  let btcPrice
  try {
    btcPrice = JSON.parse(await rp('https://www.bitstamp.net/api/v2/ticker/btcusd/'))
  } catch (e) {
    return console.error('Failed to update btc price')
  }
  return parseFloat(btcPrice.last)
}

function numberFormat (balance) {
  const balanceInt = new Intl.NumberFormat('us-US').format(balance)
  return balanceInt
}

function parseBal (balance) {
  return parseFloat((parseFloat(balance) / Math.pow(10, 9)).toFixed(10))
}

function numberToString (number) {
  if (!number) {
    return ''
  }
  return number.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1,')
}

function toHexString (byteArray) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2)
  }).join('')
}

function hexBytes (s) {
  return Buffer.from(s.replace('0x', ''), 'hex')
}

// update Semux USD and BTC price
// updateStexPrice()
// update Semux price every 5 min
// setInterval(updateStexPrice, 5 * 60 * 1000)
// update Network Stats on startup
// updateNetworkStats()
// update Network Stats every 15 min
// setInterval(updateNetworkStats, 15 * 60 * 1000)

// update Github stats on startup
// updateGithubStats()
// update Github stats every 3 hours
// setInterval(updateGithubStats, 3 * 60 * 60 * 1000)

module.exports = {
  getPrice,
  getPriceInSats,
  getCommits,
  getAllStats,
  
  numberFormat,
  parseBal,
  numberToString,
  toHexString,
  hexBytes,
}
