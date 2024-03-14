'use strict'

const test = require('node:test')
const assert = require('assert')
const { request, Agent } = require('undici')
const { createFastifyInterceptor } = require('..')
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

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)

  const dispatcher = new Agent()
    .compose(interceptor)

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

  const dispatcher = new Agent().compose(createFastifyInterceptor())
  t.after(() => dispatcher.close())
  t.after(() => server.close())

  const res = await request(`http://127.0.0.1:${server.addresses()[0].port}/`, {
    dispatcher
  })

  const text = await res.body.text()
  assert.strictEqual(text, 'hello world 2')
})

test('pass-through query string', async (t) => {
  const server = Fastify()
  server.get('/query', async (req, reply) => {
    return req.query.test
  })
  await server.listen({ port: 0 })

  const dispatcher = new Agent().compose(createFastifyInterceptor())

  t.after(() => dispatcher.close())
  t.after(() => server.close())

  const res = await request(`http://127.0.0.1:${server.addresses()[0].port}/query?test=test`, {
    dispatcher
  })

  const text = await res.body.text()
  assert.strictEqual(text, 'test', 'query string not passed through')
})

test('no server found', async (t) => {
  const dispatcher = new Agent().compose(createFastifyInterceptor({
    domain: '.local'
  }))

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

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)

  const dispatcher = new Agent().compose(interceptor)

  const res = await request('http://myserver.local/', {
    dispatcher
  })

  assert.deepStrictEqual(res.headers['x-foo'], ['bar', 'baz'])
  assert.strictEqual(await res.body.text(), 'hello world')
})

test('removes unwanted headers', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  await server.ready()

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)

  const dispatcher = new Agent().compose(interceptor)

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

test('automatic domain', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    return 'foo'
  })
  await server.ready()

  const interceptor = createFastifyInterceptor({ domain: '.local' })
  interceptor.route('myserver', server)
  const dispatcher = new Agent().compose(interceptor)

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

  const interceptor = createFastifyInterceptor({ domain: '.local' })
  interceptor.route('myserver', server)
  const dispatcher = new Agent().compose(interceptor)

  {
    const res = await request('http://myserver.local/', { dispatcher })
    assert.strictEqual(await res.body.text(), 'root')
  }

  {
    const res = await request('http://myserver.local/foo', { dispatcher })
    assert.strictEqual(await res.body.text(), 'foo')
  }
})

test('binary response', async (t) => {
  const server = Fastify()

  const randomBuffer = Buffer.alloc(4)
  randomBuffer.writeUInt32BE(2424213242)

  server.get('/', async (req, reply) => {
    reply.header('content-type', 'application/octet-stream')
    reply.send(randomBuffer)
  })
  await server.ready()

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)
  const dispatcher = new Agent().compose(interceptor)

  const res = await dispatcher.request({
    origin: 'http://myserver.local/',
    path: '/'
  })

  const data = await res.body.arrayBuffer()
  assert.deepEqual(Buffer.from(data), randomBuffer)
})

test('pass query params', async (t) => {
  const server = Fastify()
  server.get('/query', async (req, reply) => {
    return req.query.test
  })
  await server.ready()

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)
  const dispatcher = new Agent().compose(interceptor)

  const res = await dispatcher.request({
    origin: 'http://myserver.local/',
    path: '/query',
    query: { test: 'foo' }
  })
  assert.strictEqual(await res.body.text(), 'foo')
})

test('pass query string', async (t) => {
  const server = Fastify()
  server.get('/query', async (req, reply) => {
    return req.query.test
  })
  await server.ready()

  const interceptor = createFastifyInterceptor()
  interceptor.route('myserver.local', server)
  const dispatcher = new Agent().compose(interceptor)

  const res = await dispatcher.request({
    origin: 'http://myserver.local/',
    path: '/query?test=foo'
  })
  assert.strictEqual(await res.body.text(), 'foo')
})
