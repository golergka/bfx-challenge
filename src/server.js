'use strict'

const { PeerRPCServer } = require('grenache-nodejs-http')
const { serviceName } = require('./config.json')
const { initLink } = require('./link')

const TIMEOUT = 30_000

const link = initLink()

const peer = new PeerRPCServer(link, {
  timeout: TIMEOUT
})
peer.init()

const getRandomPort = () => 1024 + Math.floor(Math.random() * 64511)

const service = peer.transport('server')
const servicePort = getRandomPort()
service.listen(servicePort)

console.log(`Listening to connections on ${servicePort}`)

setInterval(() => link.announce(serviceName, service.port, {}), 1000)

service.on('request', (rid, key, payload, handler) => {
  console.log('request', rid, key, payload)
  handler.reply(null, { hello: payload.hello })
})
