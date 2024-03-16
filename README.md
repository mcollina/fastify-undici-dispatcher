# fastify-undici-dispatcher

An undici dispatcher to in-process Fastify servers

## Install

```
npm i fastify fastify-undici-dispatcher undici
```

## Usage as a Interceptor

```js
const { request, Agent } = require('undici')
const { createFastifyInterceptor } = require('fastify-undici-dispatcher')
const Fastify = require('fastify')
const server = Fastify()
server.get('/', async (req, reply) => {
  return 'hello world'
})

const interceptor = createFastifyInterceptor({
  domain: '.local' // optional
})

const dispatcher = new Agent().compose(interceptor)
dispatcher.route('myserver', server)

request('http://myserver.local', {
  dispatcher
}).then((res) => {
  return res.body.text()
}).then(console.log)
```

## Usage as a Dispatcher

```js
const { request, Agent } = require('undici')
const FastifyUndiciDispatcher = require('fastify-undici-dispatcher')
const Fastify = require('fastify')
const server = Fastify()
server.get('/', async (req, reply) => {
  return 'hello world'
})

const dispatcher = new FastifyUndiciDispatcher({
  dispatcher: new Agent(), // optional
  domain: '.local' // optional
})
dispatcher.route('myserver', server)

request('http://myserver.local', {
  dispatcher
}).then((res) => {
  return res.body.text()
}).then(console.log)
```

## License

MIT
