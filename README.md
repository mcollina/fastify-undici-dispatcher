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
dispatcher.route('myserver.local', server)

request('http://myserver.local', {
  dispatcher
}).then((res) => {
  return res.body.text()
}).then(console.log)
```

## License

MIT
