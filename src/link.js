'use strict'

const Link = require('grenache-nodejs-link')
const { grape } = require('./config.json')

/**
 * @returns {Link}
 */
const initLink = () => new Link({ grape }).start()

module.exports = { initLink }
