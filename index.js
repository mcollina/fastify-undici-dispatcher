'use strict'

const { Dispatcher } = require('undici')

class FastifyUndiciDispatcher extends Dispatcher {
  constructor (opts) {
    super()
    this.dispatcher = opts?.dispatcher
    this.routes = new Map()
    this._domain = opts?.domain
  }

  route (url, server) {
    if (this._domain && !url.endsWith(this._domain)) {
      url += this._domain
    }
    const address = server.server.address()
    this.routes.set(url, { server, address })
  }

  dispatch (opts, handler) {
    let url = opts.origin
    if (!(url instanceof URL)) {
      url = new URL(opts.path, url)
    }

    const wrap = this.routes.get(url.hostname)
    if (!wrap) {
      if (this.dispatcher && (this._domain === undefined || !url.hostname.endsWith(this._domain))) {
        return this.dispatcher.dispatch(opts, handler)
      } else {
        throw new Error('No server found for ' + url.hostname)
      }
    }

    const { server, address } = wrap

    if (opts.headers) {
      delete opts.headers.connection
      delete opts.headers['transfer-encoding']
    }

    if (address) {
      if (address.family === 'IPv6') {
        opts.origin = `http://[${address.address}]:${address.port}`
      } else {
        opts.origin = `http://${address.address}:${address.port}`
      }

      if (this.dispatcher) {
        return this.dispatcher.dispatch(opts, handler)
      }
    }

    server.inject({
      method: opts.method,
      url: url.pathname + url.search,
      headers: opts.headers,
      query: opts.query,
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
      handler.onData(res.rawPayload)
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
