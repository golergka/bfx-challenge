'use strict'

const hash = require('./hash')

/**
 * @typedef {Object} MinedBlock
 *
 * @property {string} nonce - The nonce used to mine the block.
 */

/**
 *
 * @param {Object} block
 * @param {number} difficulty
 * @returns {Generator<unknown, MinedBlock, unknown>}
 */
function* mine(block, difficulty) {
  let nonce = 0
  let blockHash
  let minedBlock

  do {
    nonce++
    minedBlock = { ...block, nonce }
    blockHash = hash(minedBlock)

    yield
  } while (blockHash.substring(0, difficulty) !== '0'.repeat(difficulty))

  return minedBlock
}

module.exports = mine
