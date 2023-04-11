# fastify-undici-dispatcher

An undici dispatcher to in-process Fastify servers

## Install

```
npm i fastify fastify-undici-dispatcher undici
```

## Usage

```js
const { request, Agent } = require('undici')
const server = Fastify()
server.get('/', async (req, reply) => {
  return 'hello world'
})

const dispatcher = new FastifyUndiciDispatcher(new Agent())

request(`http://127.0.0.1:${server.addresses()[0].port}/`, {
  dispatcher
}).then((res) => {
  return res.body.text()
}).then(console.log)
```

## License

MIT
