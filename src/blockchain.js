const hash = require('./hash')
const { matchBlock } = require('./match')
const { mineBlock, checkBlock } = require('./mine')
const { miningIterations } = require('./config.json')

/**
 * In-memory representation of blockchain, without persistence or networking.
 */
class Blockchain {
  /**
   * @property {string} clientId
   * @property {module:mine~MinedBlock[]} chain mined blocks already in the
   * chain
   * @property {module:match~Block} current work in progress block where new
   * orders are added
   * @property {Generator<unknown, MinedBlock, unknown>} mining current mining
   * operation on the latest block data
   */

  /**
   *
   * @param {string} clientId
   * @param {import('./mine').MinedBlock[]} chain
   */
  constructor(clientId, chain = [], current = undefined) {
    this.clientId = clientId
    this.chain = chain
    this.#newBlock(current)
  }

  #newBlock(block = undefined) {
    const lastBlock = this.chain[this.chain.length - 1]
    this.current =
      block ??
      (lastBlock !== undefined
        ? // @ts-ignore
          matchBlock(lastBlock)
        : {
            orders: [],
            balances: [],
            prevBlockHash: undefined
          })
    this.#resetMining()
  }

  #resetMining() {
    this.mining = mineBlock(this.current, this.clientId)
  }

  addOrder(order) {
    this.current.orders.push(order)
    this.#resetMining()
  }

  /**
   * Attempts to mine the current block.
   *
   * @returns {module:mine~MinedBlock|undefined} mined block or undefined if
   * mining is not finished
   */
  mine() {
    for (let i = 0; i < miningIterations; i++) {
      const result = this.mining.next()
      if (result.done) {
        this.chain.push(result.value)
        this.#newBlock()
        return result.value
      }
    }
    return undefined
  }

  /**
   * Accepts a valid block from elsewhere in the network.
   *
   * @param {module:mine~MinedBlock} block
   * @returns {boolean} whether the block was accepted
   */
  acceptBlock(block) {
    if (!checkBlock(block)) {
      return false
    }

    const prevBlock = this.chain[this.chain.length - 1]
    if (prevBlock !== undefined && block.prevBlockHash !== hash(prevBlock)) {
      return false
    }

    if (hash(block.balances) !== hash(this.current.balances)) {
      return false
    }

    this.chain.push(block)
    this.#newBlock()
    return true
  }
}

module.exports = Blockchain
