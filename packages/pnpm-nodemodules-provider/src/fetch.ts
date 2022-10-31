import { readFileSync } from 'fs'

function sourceResponse(buffer) {
  return {
    status: 200,
    async text() {
      return buffer.toString()
    },
    async json() {
      return JSON.parse(buffer.toString())
    },
    arrayBuffer() {
      return buffer.buffer || buffer
    },
  }
}

const dirResponse = {
  status: 200,
  async text() {
    return ''
  },
  async json() {
    throw new Error('Not JSON')
  },
  arrayBuffer() {
    return new ArrayBuffer(0)
  },
}

export const fetch = async function (url: URL, opts?: Record<string, any>) {
  if (!opts) throw new Error('Always expect fetch options to be passed')
  const urlString = url.toString()
  const protocol = urlString.slice(0, urlString.indexOf(':') + 1)
  switch (protocol) {
    case 'file:':
      if (urlString.endsWith('/')) {
        try {
          readFileSync(new URL(urlString))
          return { status: 404, statusText: 'Directory does not exist' }
        } catch (e) {
          if (e.code === 'EISDIR') return dirResponse
          throw e
        }
      }
      try {
        return sourceResponse(readFileSync(new URL(urlString)))
      } catch (e) {
        if (e.code === 'EISDIR') return dirResponse
        if (e.code === 'ENOENT' || e.code === 'ENOTDIR')
          return { status: 404, statusText: e.toString() }
        return { status: 500, statusText: e.toString() }
      }
  }
}
