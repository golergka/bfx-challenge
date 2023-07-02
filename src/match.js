'use strict'

const hash = require('./hash')

/**
 * @typedef {Object} Order
 *
 * Order for buying and selling. Source of truth, saved in the chain.
 *
 * @property {string} id - Unique order ID.
 * @property {string} clientId - Client ID who placed the order.
 * @property {string} type - Type of order, "BUY" or "SELL".
 * @property {string} asset - The asset that the order is for.
 * @property {number} quantity - The quantity of the asset.
 * @property {number} price - The price per unit of the asset.
 */

/**
 * Deep copy of the order
 *
 * @param {Order} order
 * @returns {Order} a copy of the order
 */
const copyOrder = ({ id, clientId, type, asset, quantity, price }) => ({
  id,
  clientId,
  type,
  asset,
  quantity,
  price
})

const compareStrings = (a, b) => {
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    throw new Error(`Duplicate string ${a}`)
  }
}

/**
 * @param {Order} a
 * @param {Order} b
 * @returns {number}
 */
const compareOrdersByHash = (a, b) => compareStrings(hash(a), hash(b))

/**
 * @typedef {Object} Balance
 *
 * Balance of an asset for a client. Computed from the chain. Used as a data
 * object in peer-to-peer communication.
 *
 * @property {string} clientId - Client ID.
 * @property {string} asset - The asset.
 * @property {number} quantity - The quantity of the asset.
 */

const compareBalancesByHash = (a, b) => compareStrings(hash(a), hash(b))

/**
 * @typedef {Map<string, number>} AssetBalances
 *
 * A map of client IDs to quantities of a single asset.
 */

/**
 * Checks if the given set of balances is valid and builds a reference for quick
 * access and modification.
 *
 * @param {Balance[]} balances
 * @throws if the same balance is present more than once
 * @returns {Map<string, AssetBalances>} a map of asset IDs to their
 * respective balance references
 */
function balanceListToMap(balances) {
  const result = new Map()
  for (const { clientId, asset, quantity } of balances) {
    if (!result.has(asset)) {
      result.set(asset, new Map())
    }
    const assetBalances = result.get(asset)
    if (assetBalances.has(clientId)) {
      throw new Error(`Duplicate balance for ${clientId} and ${asset}`)
    }
    assetBalances.set(clientId, quantity)
  }
  return result
}

/**
 * Gets asset balances for a given asset. If the asset is not present, creates
 * an empty balance reference for it.
 *
 * @param {Map<string, AssetBalances>} balances
 * @param {string} asset
 * @returns {AssetBalances} balance reference for the given asset
 */
function getOrCreateBalance(balances, asset) {
  if (!balances.has(asset)) {
    balances.set(asset, new Map())
  }
  return balances.get(asset)
}

/**
 * Converts balance reference to a list of balances.
 * @param {Map<string, AssetBalances>} balanceReference
 * @returns {Balance[]}
 */
function balanceMapToList(balanceReference) {
  const result = []
  for (const [asset, assetBalances] of balanceReference) {
    for (const [clientId, quantity] of assetBalances) {
      result.push({ clientId, asset, quantity })
    }
  }
  result.sort(compareBalancesByHash)
  return result
}

/**
 * **Modifies provided balances and orders in place.**
 * @param {Order} buyOrder
 * @param {Order} sellOrder
 * @param {number} quantity amount of asset to exchange
 * @param {AssetBalances} assetBalances
 * @throws if the orders don't match
 */
function executeOrders(
  buyOrder,
  sellOrder,
  quantity,
  assetBalances,
  currencyBalances
) {
  // THERE WILL BE FLOAT POINT ERRORS HERE
  // NEVER USE FLOATS FOR MONEY
  // USE A PROPER MONETY TYPE THAT HAS DIVISION WITH REMAINDER AND OTHER FEATURES

  // Give the buyer what they bought
  assetBalances.set(
    buyOrder.clientId,
    (assetBalances.get(buyOrder.clientId) || 0) + quantity
  )
  // Take the asset from the seller
  assetBalances.set(
    sellOrder.clientId,
    (assetBalances.get(sellOrder.clientId) || 0) - quantity
  )

  const price = sellOrder.price

  const currencyAmount = price * quantity

  // Give the seller default currency
  currencyBalances.set(
    sellOrder.clientId,
    (currencyBalances.get(sellOrder.clientId) || 0) + currencyAmount
  )
  // Take the default currency from the buyer
  currencyBalances.set(
    buyOrder.clientId,
    (currencyBalances.get(buyOrder.clientId) || 0) - currencyAmount
  )

  // Remove the quantity from the buy order
  buyOrder.quantity -= quantity
  // Remove the quantity from the sell order
  sellOrder.quantity -= quantity
}

/**
 * Splits all orders by asset. Does not build order books.
 * @param {Order[]} orders
 * @returns {Map<string, Order[]>} a map of asset to orders. Orders are not
 * sorted.
 */
function splitOrdersByAsset(orders) {
  const result = new Map()
  for (const order of orders) {
    if (!result.has(order.asset)) {
      result.set(order.asset, [])
    }
    result.get(order.asset).push(order)
  }
  return result
}

/**
 * @typedef {Object} OrderBook
 *
 * Order book for a given asset. Has buy and sell orders sorted by price, from
 * low to high. Best orders are at the ends of the arrays.
 *
 * @property {Order[]} buyOrders - Buy orders sorted by price, from low to high.
 * @property {Order[]} sellOrders - Sell orders sorted by price, from high to low.
 */

/**
 * Builds order books from the given orders for one asset.
 * @param {Order[]} orders
 * @returns {OrderBook} order book for the given asset
 */
const buildOrderBook = (orders) => ({
  buyOrders: orders
    .filter((o) => o.type === 'BUY')
    .sort((a, b) => a.price - b.price),
  sellOrders: orders
    .filter((o) => o.type === 'SELL')
    .sort((a, b) => b.price - a.price)
})

/**
 * Builds order books from the given orders for all assets.
 *
 * @param {Order[]} orders
 * @returns {[string, OrderBook][]}
 */
const buildOrderBooks = (orders) =>
  [...splitOrdersByAsset(orders.map(copyOrder))].map(([asset, orders]) => [
    asset,
    buildOrderBook(orders)
  ])

/**
 * Combines order books to a list of orders, stably sorted by hash.
 *
 * @param {[string, OrderBook][]} orderBooks
 * @returns {Order[]}
 */
function orderBooksToOrders(orderBooks) {
  const result = []
  for (const [_, orderBook] of orderBooks) {
    result.push(...orderBook.buyOrders, ...orderBook.sellOrders)
  }
  result.sort(compareOrdersByHash)
  return result
}
/**
 * Pops the last order and all other orders with the same price.
 * **Modifies the provided array in place.*
 *
 * @param {Order[]} orders non-empty array of sorted orders, from worst to best
 * @throws if the order array is empty
 * @returns {[Order[], number]} popped orders, sorted by their hash, and their price
 */
function popBestOrders(orders) {
  const bestOrderPrice = orders[orders.length - 1].price
  const result = []
  while (
    orders.length > 0 &&
    orders[orders.length - 1].price === bestOrderPrice
  ) {
    result.push(orders.pop())
  }
  result.sort(compareOrdersByHash)
  return [result, bestOrderPrice]
}

/**
 * Matches order book and balances for a single asset.
 * **Modifies both provided objects in place.**
 *
 * @param {OrderBook} orderBook orders for the given asset
 * @param {AssetBalances} assetBalances balances for the given asset
 * @param {AssetBalances} currencyBalances balances for the default currency
 */
function matchOrderBook(orderBook, assetBalances, currencyBalances) {
  while (orderBook.buyOrders.length > 0 && orderBook.sellOrders.length > 0) {
    const [bestBuyOrders, bestBuyPrice] = popBestOrders(orderBook.buyOrders)
    const [bestSellOrders, bestSellPrice] = popBestOrders(orderBook.sellOrders)

    if (bestBuyPrice < bestSellPrice) {
      orderBook.buyOrders.push(...bestBuyOrders)
      orderBook.sellOrders.push(...bestSellOrders)
      break
    }

    while (bestBuyOrders.length > 0 && bestSellOrders.length > 0) {
      const buyOrder = bestBuyOrders[0]
      const sellOrder = bestSellOrders[0]
      const quantity = Math.min(buyOrder.quantity, sellOrder.quantity)
      executeOrders(
        buyOrder,
        sellOrder,
        quantity,
        assetBalances,
        currencyBalances
      )
      if (buyOrder.quantity === 0) {
        bestBuyOrders.shift()
      }
      if (sellOrder.quantity === 0) {
        bestSellOrders.shift()
      }
    }

    if (bestBuyOrders.length > 0) {
      orderBook.buyOrders.push(...bestBuyOrders)
    }

    if (bestSellOrders.length > 0) {
      orderBook.sellOrders.push(...bestSellOrders)
    }
  }
}

/**
 * @typedef {Object} Block
 *
 * Block of orders and previous balances. Source of truth, saved in the chain.
 * Solving it produces a new set of balances and (unfulfilled) orders.
 *
 * Not yet mined, so a work in progress.
 *
 * @property {Order[]} orders - Orders to be fulfilled.
 * @property {Balance[]} balances - Balances before the orders were
 * fulfilled.
 * @property {string|undefined} prevBlockHash — Hash of the previous block.
 * Empty for first block in chain.
 */

/** Default currency that other assets are bought or sold with */
const defaultAsset = 'BTC'

/**
 * Matches the given block of orders with the given balances. Returns orders
 * and balances that serve as a beginning of a new block.
 *
 * @param {Block} prevBlock
 * @return {Block} a new block with remaining orders and updated balances
 */
function matchBlock(prevBlock) {
  const orderBooks = buildOrderBooks(prevBlock.orders)
  const balances = balanceListToMap(prevBlock.balances)

  const currencyBalances = getOrCreateBalance(balances, defaultAsset)
  for (const [asset, orderBook] of orderBooks) {
    matchOrderBook(
      orderBook,
      getOrCreateBalance(balances, asset),
      currencyBalances
    )
  }

  return {
    orders: orderBooksToOrders(orderBooks),
    balances: balanceMapToList(balances),
    prevBlockHash: hash(prevBlock)
  }
}

module.exports = {
  defaultAsset,
  executeOrders,
  popBestOrders,
  matchBlock,
  buildOrderBooks
}
