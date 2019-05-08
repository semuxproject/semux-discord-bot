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
    totalCommits += commits.all.slice(48, 52).reduce((sum, currentVal) => sum + currentVal)
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
  console.log(stats)
  console.log(typeof stats)
  data.priceUSD = stats.price_usd
  data.priceBTC = stats.price_btc
  data.totalTransactions = stats.total_transactions
  data.totalAddresses = stats.total_addresses
  data.validatorRoi = stats.validator_roi
  data.blockchainSize = stats.blockchain_size
  data.marketCap = stats.market_cap
  data.circulatingSupply = stats.current_supply
  data.maxSupply = stats.max_supply
}

// update Network Stats on startup
updateNetworkStats()
// update Network Stats every 15 min
setInterval(updateNetworkStats, 15 * 60 * 1000)

// update Github stats on startup
updateGithubStats()
// update Github stats every 3 hours
setInterval(updateGithubStats, 3 * 60 * 60 * 1000)

module.exports = {
  getPrice,
  getPriceInSats,
  getCommits,
  getAllStats
}
