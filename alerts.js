const rp = require('request-promise')

const EXCHANGES = require('./config/exchanges.json')
const API = 'https://api.semux.online/v2.3.0/'
const TX_VALUE = 2500 // SEM
let BEST_HEIGHT = 0

async function scanNewBlock () {
  let lastHeight
  try {
    lastHeight = JSON.parse(await rp(`${API}latest-block-number`))
  } catch (e) {
    console.error('Failed to get latest block number', e.message)
    return {error: true}
  }
  lastHeight = parseInt(lastHeight.result, 10)
  if (lastHeight === BEST_HEIGHT) {
    return {error: true}
  }
  BEST_HEIGHT = lastHeight
  let block
  try {
    block = JSON.parse(await rp(`${API}block-by-number?number=${BEST_HEIGHT}`))
  } catch (e) {
    console.error('Failed to get block by number', e.message)
    return {error: true}
  }
  if (!block.result || !block.result.transactions) {
    return {error: true}
  }
  let transfers = []
  for (let tx of block.result.transactions) {
    let value = parseInt(tx.value, 10) / 1e9
    if (tx.type !== 'TRANSFER' || value < TX_VALUE) {
      continue
    }
    if (EXCHANGES[tx.from]) {
      transfers.push({exchange: EXCHANGES[tx.from], value: value.toFixed(2), type: 'withdrawn'})
    }
    if (EXCHANGES[tx.to]) {
      transfers.push({exchange: EXCHANGES[tx.to], value: value.toFixed(2), type: 'deposited'})
    }
  }
  return {success: true, transfers: transfers}
}

module.exports = {
  scanNewBlock,
}
