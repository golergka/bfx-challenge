const { PeerRPCServer } = require('grenache-nodejs-http')

/**
 *
 * @param {import('grenache-nodejs-link')} link
 * @param {string} name
 * @param {(payload: any, handler: import('grenache-nodejs-http').RPCServerHandler) => void} handler
 */
function initService(link, name, handler) {
  const peer = new PeerRPCServer(link)
  peer.init()
  const service = peer.transport('server')
  const servicePort = 1024 + Math.floor(Math.random() * 64511)
  service.listen(servicePort)
  console.log(`Service ${name} listening on port ${servicePort}`)
  setInterval(() => link.announce(name, service.port, {}), 1000)
  service.on('request', (rid, key, payload, h) => handler(payload, h))
}

module.exports = { initService }
