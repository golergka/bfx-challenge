const hash = require('./hash')
const { matchBlock } = require('./match')
const { mineBlock, checkBlock } = require('./mine')

class Blockchain {
  /**
   * @property {module:mine~MinedBlock[]} chain mined blocks already in the
   * chain
   * @property {module:match~Block} current work in progress block where new
   * orders are added
   * @property {Generator<unknown, MinedBlock, unknown>} mining current mining
   * operation on the latest block data
   */

  constructor(chain = []) {
    this.chain = chain
    this.#newBlock()
  }

  #newBlock() {
    const lastBlock = this.chain[this.chain.length - 1]
    this.current =
      lastBlock !== undefined
        ? matchBlock(lastBlock)
        : {
            orders: [],
            balances: [],
            prevBlockHash: undefined
          }
    this.#resetMining()
  }

  #resetMining() {
    this.mining = mineBlock(this.current)
  }

  addOrder(order) {
    this.current.orders.push(order)
    this.#resetMining()
  }

  /**
   * Attempts to mine the current block.
   *
   * @param {number} iterations
   * @returns {module:mine~MinedBlock|undefined} mined block or undefined if
   * mining is not finished
   */
  mine(iterations) {
    for (let i = 0; i < iterations; i++) {
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
   */
  acceptBlock(block) {
    if (!checkBlock(block)) {
      throw new Error('Invalid block: wrong hash')
    }

    const prevBlock = this.chain[this.chain.length - 1]
    if (block.prevBlockHash !== prevBlock.hash) {
      throw new Error('Invalid block: wrong prev block hash')
    }

    if (hash(block.balances) !== hash(this.current.balances)) {
      throw new Error('Invalid block: wrong balances')
    }

    this.chain.push(block)
    this.#newBlock()
  }
}
