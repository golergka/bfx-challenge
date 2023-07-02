'use strict'

const hash = require('./hash')
const { difficulty } = require('./config.json')

/**
 * @typedef {Object} MinedBlock
 *
 * @property {string} nonce - The nonce used to mine the block.
 */

/**
 * Checks that the block hash is valid.
 *
 * @param {MinedBlock} block
 */
const checkBlock = (block) =>
  hash(block).substring(0, difficulty) === '0'.repeat(difficulty)

/**
 *
 * @param {Object} block
 * @returns {Generator<unknown, MinedBlock, unknown>}
 */
function* mineBlock(block) {
  const minedBlock = { ...block, nonce: 0 }

  while (!checkBlock(minedBlock)) {
    minedBlock.nonce++
    yield
  }

  return minedBlock
}

module.exports = { mineBlock, checkBlock }
