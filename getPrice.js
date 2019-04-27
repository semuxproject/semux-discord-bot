'use strict'
const request = require('request')

const MARKETCAP = 'https://api.coinmarketcap.com/v1/ticker/Semux'

const data = {
  priceUSD: 0
}

function getPrice () {
  return data.priceUSD
}

function fetchPriceFromCMC () {
  request(MARKETCAP, (error, response, body) => {
    if (error) {
      return console.error('Failed to fetch SEM/USD price from Coinmarketcap')
    }
    let dataCoin
    try {
      dataCoin = JSON.parse(body)
    } catch (e) {
      console.log('Api Coinmarket Problem' + e)
      return
    }
    let marketcapInfo = dataCoin[0]
    data.priceUSD = marketcapInfo['price_usd']
  })
}

// update SEM price on startup
fetchPriceFromCMC()
// update SEM price every 15 min
setInterval(fetchPriceFromCMC, 15 * 60 * 1000)

module.exports = getPrice
