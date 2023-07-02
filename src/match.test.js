import { describe, it, expect } from 'vitest'
import {
  matchBlock,
  executeOrders,
  popBestOrders,
  buildOrderBooks
} from './match'

describe(buildOrderBooks.name, () => {
  it('builds order books for orders on the same asset', () => {
    const orders = [
      {
        id: '1',
        clientId: 'Ada',
        type: 'BUY',
        asset: 'ETH',
        quantity: 100,
        price: 2
      },
      {
        id: '2',
        clientId: 'Bob',
        type: 'SELL',
        asset: 'ETH',
        quantity: 50,
        price: 2
      },
      {
        id: '3',
        clientId: 'Charlie',
        type: 'SELL',
        asset: 'ETH',
        quantity: 50,
        price: 2
      }
    ]

    const orderBooks = buildOrderBooks(orders)

    expect(orderBooks).toHaveLength(1)

    const ethOrderBook = orderBooks.find(([asset]) => asset === 'ETH')[1]
    expect(ethOrderBook.buyOrders).toHaveLength(1)
    expect(ethOrderBook.sellOrders).toHaveLength(2)
  })
})

describe(popBestOrders.name, () => {
  it('pops two orders with matching price', () => {
    const orders = [
      {
        id: '2',
        clientId: 'Bob',
        type: 'SELL',
        asset: 'ETH',
        quantity: 50,
        price: 2
      },
      {
        id: '3',
        clientId: 'Charlie',
        type: 'SELL',
        asset: 'BTC',
        quantity: 50,
        price: 2
      }
    ]

    const bestOrders = popBestOrders(orders)[0]

    expect(orders).toHaveLength(0)
    expect(bestOrders).toHaveLength(2)
  })
})

describe(executeOrders.name, () => {
  it('executes two completely matchin orders', () => {
    const buyOrder = {
      id: '1',
      clientId: 'Ada',
      type: 'BUY',
      asset: 'ETH',
      quantity: 100,
      price: 2
    }

    const sellOrder = {
      id: '2',
      clientId: 'Bob',
      type: 'SELL',
      asset: 'ETH',
      quantity: 100,
      price: 2
    }

    const assetBalances = new Map()
    const currencyBalances = new Map()

    executeOrders(buyOrder, sellOrder, 100, assetBalances, currencyBalances)

    expect(buyOrder.quantity).toBe(0)
    expect(sellOrder.quantity).toBe(0)
    expect(assetBalances.get('Ada')).toBe(100)
    expect(assetBalances.get('Bob')).toBe(-100)
    expect(currencyBalances.get('Ada')).toBe(-200)
    expect(currencyBalances.get('Bob')).toBe(200)
  })

  it('updates existing balances as it matches orders', () => {
    const buyOrder = {
      id: '1',
      clientId: 'Ada',
      type: 'BUY',
      asset: 'ETH',
      quantity: 100,
      price: 2
    }
    const sellOrder = {
      id: '2',
      clientId: 'Bob',
      type: 'SELL',
      asset: 'ETH',
      quantity: 50,
      price: 2
    }

    const assetBalances = new Map([
      ['Ada', 100],
      ['Bob', 50]
    ])

    const currencyBalances = new Map([
      ['Ada', 100],
      ['Bob', -100]
    ])

    executeOrders(buyOrder, sellOrder, 50, assetBalances, currencyBalances)

    expect(buyOrder.quantity).toBe(50)
    expect(sellOrder.quantity).toBe(0)
    expect(assetBalances.get('Ada')).toBe(150)
    expect(assetBalances.get('Bob')).toBe(0)
    expect(currencyBalances.get('Ada')).toBe(0)
    expect(currencyBalances.get('Bob')).toBe(0)
  })
})

describe(matchBlock.name, () => {
  it('given an empty block, produces an empty block', () => {
    const prevBlock = {
      orders: [],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expect(nextBlock.orders).toHaveLength(0)
    expect(nextBlock.balances).toHaveLength(0)
  })

  it("given a block with no orders, doesn't change any balances", () => {
    const prevBlock = {
      orders: [],
      balances: [
        {
          clientId: 'Ada',
          asset: 'BTC',
          quantity: 1
        },
        {
          clientId: 'Bob',
          asset: 'BTC',
          quantity: 2
        }
      ],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'BTC', 'Ada', 1)
    expectBalance(nextBlock, 'BTC', 'Bob', 2)
  })

  it("given a block with one order, doesn' change any balances and orders", () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'BTC',
          quantity: 345,
          price: 123
        }
      ],
      balances: [
        {
          clientId: 'Ada',
          asset: 'BTC',
          quantity: 1
        },
        {
          clientId: 'Bob',
          asset: 'BTC',
          quantity: 2
        }
      ],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'BTC', 'Ada', 1)
    expectBalance(nextBlock, 'BTC', 'Bob', 2)
    expectOrder(nextBlock, '1', 345)
  })

  it('matches two completely matching orders', () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 100,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 100)
    expectBalance(nextBlock, 'ETH', 'Bob', -100)
    expectBalance(nextBlock, 'BTC', 'Ada', -200)
    expectBalance(nextBlock, 'BTC', 'Bob', 200)

    expectOrder(nextBlock, '1', undefined)
  })

  it('matches partially matching orders', () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 50)
    expectBalance(nextBlock, 'ETH', 'Bob', -50)
    expectBalance(nextBlock, 'BTC', 'Ada', -100)
    expectBalance(nextBlock, 'BTC', 'Bob', 100)
  })

  it('updates existing balances as it matches orders', () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [
        {
          clientId: 'Ada',
          asset: 'ETH',
          quantity: 100
        },
        {
          clientId: 'Bob',
          asset: 'ETH',
          quantity: 50
        },
        {
          clientId: 'Ada',
          asset: 'BTC',
          quantity: 100
        },
        {
          clientId: 'Bob',
          asset: 'BTC',
          quantity: -100
        }
      ],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 150)
    expectBalance(nextBlock, 'ETH', 'Bob', 0)
    expectBalance(nextBlock, 'BTC', 'Ada', 0)
    expectBalance(nextBlock, 'BTC', 'Bob', 0)
  })

  it('matches multiple orders of a single price', () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        },
        {
          id: '3',
          clientId: 'Charlie',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 100)
    expectBalance(nextBlock, 'ETH', 'Bob', -50)
    expectBalance(nextBlock, 'ETH', 'Charlie', -50)
    expectBalance(nextBlock, 'BTC', 'Ada', -200)
    expectBalance(nextBlock, 'BTC', 'Bob', 100)
    expectBalance(nextBlock, 'BTC', 'Charlie', 100)
  })

  it("doesn't match buy order with sell order of higher price", () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 3
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 0)
    expectBalance(nextBlock, 'ETH', 'Bob', 0)
    expectBalance(nextBlock, 'BTC', 'Ada', 0)
    expectBalance(nextBlock, 'BTC', 'Bob', 0)

    expectOrder(nextBlock, '1', 100)
    expectOrder(nextBlock, '2', 50)
  })

  it('matches buy order with sell order of lower price', () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 3
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 50)
    expectBalance(nextBlock, 'ETH', 'Bob', -50)
    expectBalance(nextBlock, 'BTC', 'Ada', -100)
    expectBalance(nextBlock, 'BTC', 'Bob', 100)

    expectOrder(nextBlock, '1', 50)
    expectOrder(nextBlock, '2', undefined)
  })

  it("doesn't match orders on different assets", () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'BTC',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 0)
    expectBalance(nextBlock, 'ETH', 'Bob', 0)
    expectBalance(nextBlock, 'BTC', 'Ada', 0)
    expectBalance(nextBlock, 'BTC', 'Bob', 0)

    expectOrder(nextBlock, '1', 100)
    expectOrder(nextBlock, '2', 50)
  })

  it("doesn't match two buy orders", () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'BUY',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'BUY',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 0)
    expectBalance(nextBlock, 'ETH', 'Bob', 0)
    expectBalance(nextBlock, 'BTC', 'Ada', 0)
    expectBalance(nextBlock, 'BTC', 'Bob', 0)

    expectOrder(nextBlock, '1', 100)
    expectOrder(nextBlock, '2', 50)
  })

  it("doesn't match two sell orders", () => {
    const prevBlock = {
      orders: [
        {
          id: '1',
          clientId: 'Ada',
          type: 'SELL',
          asset: 'ETH',
          quantity: 100,
          price: 2
        },
        {
          id: '2',
          clientId: 'Bob',
          type: 'SELL',
          asset: 'ETH',
          quantity: 50,
          price: 2
        }
      ],
      balances: [],
      prevBlockHash: '0'
    }

    const nextBlock = matchBlock(prevBlock)

    expectBalance(nextBlock, 'ETH', 'Ada', 0)
    expectBalance(nextBlock, 'ETH', 'Bob', 0)
    expectBalance(nextBlock, 'BTC', 'Ada', 0)
    expectBalance(nextBlock, 'BTC', 'Bob', 0)

    expectOrder(nextBlock, '1', 100)
    expectOrder(nextBlock, '2', 50)
  })
})

function expectBalance(block, asset, clientId, expected) {
  const balance = block.balances.find(
    (b) => b.asset === asset && b.clientId === clientId
  )
  const actual = balance?.quantity ?? 0
  if (actual !== expected) {
    throw new Error(
      `Expected balance of ${expected} for ${clientId} ${asset}, got ${actual}`
    )
  }
}

function expectOrder(block, id, quantity) {
  const order = block.orders.find((o) => o.id === id)
  expect(order?.quantity).toBe(quantity)
}
