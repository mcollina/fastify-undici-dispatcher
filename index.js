'use strict'

const { Dispatcher } = require('undici')

class FastifyUndiciDispatcher extends Dispatcher {
  constructor (dispatcher) {
    super()
    this.dispatcher = dispatcher
    this.routes = new Map()
  }

  route (url, server) {
    this.routes.set(url, server)
  }

  dispatch (opts, handler) {
    let url = opts.origin
    if (!(url instanceof URL)) {
      url = new URL(opts.path, url)
    }

    const server = this.routes.get(url.hostname)
    if (!server) {
      if (this.dispatcher) {
        return this.dispatcher.dispatch(opts, handler)
      } else {
        throw new Error('No server found for ' + url.hostname)
      }
    }

    if (opts.headers) {
      delete opts.headers.connection
      delete opts.headers['transfer-encoding']
    }

    server.inject({
      method: opts.method,
      url: url.pathname,
      headers: opts.headers,
      body: opts.body
    }).then(res => {
      const headers = []
      for (const [key, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            headers.push(key)
            headers.push(v)
          }
        } else {
          headers.push(key)
          headers.push(value)
        }
      }
      handler.onHeaders(res.statusCode, headers, () => {}, res.statusMessage)
      handler.onData(res.body)
      handler.onComplete([])
      /* c8 ignore next 3 */
    }).catch(err => {
      handler.onError(err)
    })
    return true
  }

  close () {
    if (this.dispatcher) {
      return this.dispatcher.close()
    }
  }

  destroy () {
    if (this.dispatcher) {
      return this.dispatcher.destroy()
    }
  }
}

module.exports = FastifyUndiciDispatcher
