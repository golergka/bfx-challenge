'use strict'

const crypto = require('crypto')

const hash = (data) =>
	crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')

module.exports = hash
