const { initLink } = require('./link')
const { PeerRPCClient } = require('grenache-nodejs-http')
const Blockchain = require('./blockchain')
const { initService } = require('./service')

const services = {
  getChain: 'getChain',
  addOrder: 'addOrder',
  acceptBlock: 'acceptBlock'
}

/**
 * Node of the blockchain, with networking.
 *
 * @param {string} clientId
 */
async function initNode(clientId) {
  console.log(`👋 Starting node for ${clientId}...`)
  const link = initLink()
  if (link == null) {
    throw new Error('Link has not been initialized')
  }

  const peerClient = new PeerRPCClient(link, {})
  peerClient.init()

  /**
   * Attempts to get the chain from a peer. If the peer is not available, returns
   * undefined.
   *
   * @returns {Promise<{ chain: import('./mine').MinedBlock[], current: import('./match').Block }|undefined>}
   */
  async function getChain() {
    try {
      return await new Promise((resolve, reject) => {
        peerClient.request(
          services.getChain,
          undefined,
          {
            timeout: 1000
          },
          (err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(res)
            }
          }
        )
      })
    } catch (err) {
      // TODO - check if the error is timeout
      return undefined
    }
  }

  const start = await getChain()
  let blockchain
  if (start !== undefined) {
    console.log('⛓ Retrieved chain', start)
    blockchain = new Blockchain(clientId, start.chain, start.current)
  } else {
    console.log('⛓ No chain found, starting anew')
    blockchain = new Blockchain(clientId)
  }

  function debugPrint() {
    console.log('📦 CURRENT ORDERS')
    for (const order of blockchain.current.orders) {
      console.log(
        ` ${order.type} ${order.quantity} ${order.asset} @ ${order.price} (${order.clientId})`
      )
    }

    console.log('💰 CURRENT BALANCES')
    for (const balance of blockchain.current.balances) {
      console.log(` ${balance.quantity} ${balance.asset} (${balance.clientId})`)
    }
  }

  debugPrint()

  /**
   * @param {import('./match').Order} order
   * @returns {Promise<void>}
   */
  const addOrder = (order) => {
    console.log(`📦 Sending order`, order)
    blockchain.addOrder(order)
    debugPrint()
    return new Promise((resolve, reject) => {
      peerClient.map(services.addOrder, order, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  initService(link, services.getChain, (_, handler) => {
    console.log('📡 Serving chain')
    handler.reply(null, {
      chain: blockchain.chain,
      current: blockchain.current
    })
  })

  initService(link, services.addOrder, (order, handler) => {
    if (order.clientId === clientId) {
      handler.reply(null, null) // 200 OK
      return
    }
    console.log(`📦 Received order`, order)
    debugPrint()
    blockchain.addOrder(order)
    handler.reply(null, null) // 200 OK
  })

  initService(link, services.acceptBlock, (block, handler) => {
    if (block.clientId === clientId) {
      handler.reply(null, false) // 200 OK
      return
    }
    const result = blockchain.acceptBlock(block)
    console.log(`⛓ Received block ${result ? `✅` : `❌`}`, block)
    debugPrint()
    handler.reply(null, result)
  })

  setInterval(() => {
    const newBlock = blockchain.mine()
    if (newBlock) {
      console.log(`⛓ Mined new block`, newBlock)
      peerClient.map(services.acceptBlock, newBlock)
    } else {
      console.log('⛓ Mining unsuccessful')
    }
    debugPrint()
  }, 1000)

  return {
    addOrder,
    getBalances: () => blockchain.current.balances,
    getOrders: () => blockchain.current.orders
  }
}

module.exports = { initNode }
