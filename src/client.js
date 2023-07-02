'use strict'

const { PeerRPCClient } = require('grenache-nodejs-http')
const { serviceName } = require('./config.json')
const { initLink } = require('./link')

const link = initLink()

const peer = new PeerRPCClient(link)
peer.init()
peer.request(
  serviceName,
  { hello: 'world' },
  { timeout: 1000 },
  (err, data) => {
    if (err) {
      console.error(err)
      process.exit(-1)
    }
    console.log(data)
  }
)
