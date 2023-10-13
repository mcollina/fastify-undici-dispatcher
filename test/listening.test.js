'use strict'

const test = require('node:test')
const assert = require('assert')
const { request, Agent } = require('undici')
const FastifyUndiciDispatcher = require('..')
const Fastify = require('fastify')
const FastifyExpress = require('@fastify/express')
const { Router } = require('express')

test('listening server', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'root'
  })
  server.get('/foo', async (req, reply) => {
    assert.notStrictEqual(req.headers['user-agent'], 'lightMyRequest')
    return 'foo'
  })
  await server.listen({ port: 0 })
  t.after(() => server.close())

  const dispatcher = new FastifyUndiciDispatcher({
    dispatcher: new Agent()
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

test('supports @fastify/express', async (t) => {
  const server = Fastify()

  const router = Router()

  router.get('/', (req, res) => {
    res.send('root')
  })
  router.get('/foo', (req, res) => {
    res.send('foo')
  })

  await server.register(FastifyExpress)
  server.use(router)

  await server.listen({ port: 0 })
  t.after(() => server.close())

  const dispatcher = new FastifyUndiciDispatcher({
    dispatcher: new Agent()
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
