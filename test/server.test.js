// test/server.test.js
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

/**
 * Helper to perform an HTTP GET request returning a promise.
 * @param {number} port - Port where the server is listening.
 * @returns {Promise<{statusCode:number, body:string}>}
 */
function httpGet (port) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/', timeout: 5000 }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data })
      })
    })
    req.on('error', reject)
  })
}

describe('Graceful shutdown behavior', () => {
  const serverScript = path.resolve(__dirname, '../src/server.js')
  const port = 4000
  let serverProcess = null

  beforeEach(done => {
    // Spawn a separate Node process that starts the server
    serverProcess = spawn('node', [serverScript, port], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    // Wait for the server to start listening (simple delay)
    setTimeout(done, 500)
  })

  afterEach(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGKILL')
    }
    serverProcess = null
  })

  test('completes in‑flight request after SIGTERM', async () => {
    // Start a long request (simulated by a custom handler that delays 2 seconds)
    // Send a request that will take ~2 seconds to respond
    const longRequest = httpGet(port)
    // Give the request a moment to reach the server, then send SIGTERM
    setTimeout(() => {
      serverProcess.kill('SIGTERM')
    }, 100)
    const response = await longRequest
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('OK')
    // Ensure the process exits with code 0
    const exitCode = await new Promise(resolve => {
      serverProcess.on('exit', (code) => resolve(code))
    })
    expect(exitCode).toBe(0)
  })

  test('drains multiple concurrent requests on SIGINT', async () => {
    const requestPromises = []
    // Fire 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      requestPromises.push(httpGet(port))
    }
    // After a short delay, send SIGINT
    setTimeout(() => {
      serverProcess.kill('SIGINT')
    }, 100)
    const responses = await Promise.all(requestPromises)
    responses.forEach(r => {
      expect(r.statusCode).toBe(200)
      expect(r.body).toBe('OK')
    })
    const exitCode = await new Promise(resolve => {
      serverProcess.on('exit', (code) => resolve(code))
    })
    expect(exitCode).toBe(0)
  })
})
