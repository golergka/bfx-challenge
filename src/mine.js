'use strict'

const hash = require('./hash')
const { miningDifficulty } = require('./config.json')

/**
 * @typedef {Object} MinedBlock
 *
 * @property {string} nonce - The nonce used to mine the block.
 * @property {string} clientId - The client who mined this block.
 */

/**
 * Checks that the block hash is valid.
 *
 * @param {MinedBlock} block
 */
const checkBlock = (block) =>
  hash(block).substring(0, miningDifficulty) === '0'.repeat(miningDifficulty)

/**
 *
 * @param {Object} block
 * @param {string} clientId
 * @returns {Generator<unknown, MinedBlock, unknown>}
 */
function* mineBlock(block, clientId) {
  const minedBlock = { ...block, clientId, nonce: 0 }

  while (!checkBlock(minedBlock)) {
    minedBlock.nonce++
    yield
  }

  return minedBlock
}

module.exports = { mineBlock, checkBlock }
