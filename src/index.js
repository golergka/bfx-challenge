const { initNode } = require('./node')

;(async function () {
  const clientId = Math.random().toString(36).substring(7)
  const node = await initNode(clientId)

  setInterval(() => {
    if (Math.random() < 0.2) {
      node.addOrder({
        clientId,
        id: Math.random().toString(36).substring(7),
        asset: 'ETH',
        price: Math.floor(Math.random() * 10),
        quantity: Math.floor(Math.random() * 100),
        type: Math.random() < 0.5 ? 'BUY' : 'SELL'
      })
    }

  }, 1000)
})()
