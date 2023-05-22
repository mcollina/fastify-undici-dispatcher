'use strict'

const test = require('test')
const assert = require('assert')
const { request, Agent } = require('undici')
const FastifyUndiciDispatcher = require('.')
const Fastify = require('fastify')

test('basic usage', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    return 'foo'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  {
    const res = await request('http://myserver.local/', { dispatcher })
    assert.strictEqual(await res.body.text(), 'root')
  }

  {
    const res = await request('http://myserver.local/foo', { dispatcher })
    assert.strictEqual(await res.body.text(), 'foo')
  }
})

test('pass-through', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'hello world 2'
  })
  await server.listen({ port: 0 })

  const dispatcher = new FastifyUndiciDispatcher({
    dispatcher: new Agent()
  })
  t.after(() => dispatcher.close())
  t.after(() => server.close())

  const res = await request(`http://127.0.0.1:${server.addresses()[0].port}/`, {
    dispatcher
  })

  const text = await res.body.text()
  assert.strictEqual(text, 'hello world 2')
})

test('no server found', async (t) => {
  const dispatcher = new FastifyUndiciDispatcher()

  await assert.rejects(request('http://myserver.local/', {
    dispatcher
  }), new Error('No server found for myserver.local'))
})

test('array headers', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    reply.header('x-foo', ['bar', 'baz'])
    return 'hello world'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  const res = await request('http://myserver.local/', {
    dispatcher
  })

  assert.deepStrictEqual(res.headers['x-foo'], ['bar', 'baz'])
  assert.strictEqual(await res.body.text(), 'hello world')
})

test('should destroy the dispatcher', async (t) => {
  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.destroy()
})

test('should destroy the dispatcher', async (t) => {
  let destroyed = false
  const dispatcher = new FastifyUndiciDispatcher({
    dispatcher: {
      destroy () {
        destroyed = true
      }
    }
  })
  dispatcher.destroy()
  assert.strictEqual(destroyed, true)
})

test('dispatcher.request()', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    return 'foo'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  {
    const res = await dispatcher.request({ origin: 'http://myserver.local/', path: '/' })
    assert.strictEqual(await res.body.text(), 'root')
  }

  {
    const res = await dispatcher.request({ origin: 'http://myserver.local/', path: '/foo' })
    assert.strictEqual(await res.body.text(), 'foo')
  }
})

test('removes unwanted headers', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  const res = await dispatcher.request({
    origin: 'http://myserver.local/',
    path: '/',
    headers: {
      connection: undefined,
      'transfer-encoding': undefined
    }
  })
  assert.strictEqual(await res.body.text(), 'root')
})

test('quick fail', { timeout: 500 }, async (t) => {
  const dispatcher = new FastifyUndiciDispatcher({
    dispatcher: new Agent(),
    domain: '.local'
  })

  await assert.rejects(request('http://myserver.local/', { dispatcher }), new Error('No server found for myserver.local'))
})

test('automatic domain', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    return 'foo'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher({
    domain: '.local'
  })
  dispatcher.route('myserver', server)

  {
    const res = await request('http://myserver.local/', { dispatcher })
    assert.strictEqual(await res.body.text(), 'root')
  }

  {
    const res = await request('http://myserver.local/foo', { dispatcher })
    assert.strictEqual(await res.body.text(), 'foo')
  }
})

test('automatic domain / 2', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    return 'foo'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher({
    domain: '.local'
  })
  dispatcher.route('myserver.local', server)

  {
    const res = await request('http://myserver.local/', { dispatcher })
    assert.strictEqual(await res.body.text(), 'root')
  }

  {
    const res = await request('http://myserver.local/foo', { dispatcher })
    assert.strictEqual(await res.body.text(), 'foo')
  }
})
