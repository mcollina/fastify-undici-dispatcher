'use strict'

const { Dispatcher } = require('undici')

function createFastifyInterceptor (opts) {
  const routes = new Map()
  const domain = opts?.domain
  const res = (dispatch) => {
    return (opts, handler) => {
      let url = opts.origin
      if (!(url instanceof URL)) {
        url = new URL(opts.path, url)
      }

      const wrap = routes.get(url.hostname)
      if (!wrap) {
        if (dispatch && (domain === undefined || !url.hostname.endsWith(domain))) {
          return dispatch(opts, handler)
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

        return dispatch(opts, handler)
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
  }

  res.route = (url, server) => {
    if (domain && !url.endsWith(domain)) {
      url += domain
    }
    const address = server.server.address()
    routes.set(url, { server, address })
  }

  return res
}

class FastifyUndiciDispatcher extends Dispatcher {
  constructor (opts) {
    super()
    this.dispatcher = opts?.dispatcher
    const interceptor = createFastifyInterceptor(opts)
    this.route = interceptor.route
    if (this.dispatcher) {
      this.dispatch = interceptor(this.dispatcher.dispatch.bind(this.dispatcher))
    } else {
      this.dispatch = interceptor()
    }
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
module.exports.createFastifyInterceptor = createFastifyInterceptor
