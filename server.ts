import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

import { networkInterfaces } from 'os'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const nets = networkInterfaces()
const netsResults = Object.create(null)
for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      if (!netsResults[name]) {
        netsResults[name] = []
      }
      netsResults[name].push(net.address)
    }
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url || '', true)
      const { pathname, query } = parsedUrl

      if (pathname === '/a') {
        await app.render(req, res, '/a', query)
      } else if (pathname === '/b') {
        await app.render(req, res, '/b', query)
      } else {
        await handle(req, res, parsedUrl)
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  })
  io.on('connection', (socket) => {
    const createdMessage = (msg: []) => {
      socket.broadcast.emit('newIncomingMessage', msg)
    }

    socket.on('createdMessage', createdMessage)
    // welcomeGate
    // galleryRoom
    // mainStage

    socket.on('galleryRoom', (msg) => {
      socket.broadcast.emit('galleryRoom', msg)

      console.log('galleryRoom', msg)
    })
  })

  // SerialPort.list().then((ports) => {
  //   ports.forEach(function (port) {
  //     console.log(port.path)
  //   })
  // })

  // const serialPort = new SerialPort({
  //   path: '/dev/cu.usbserial-0001',
  //   baudRate: 115200,
  // })
  // const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
  // parser.on('data', (data) => {
  //   const [key, value] = data.split('=')

  //   if (key === 'stopwatchTime') {
  //     io.emit('stopwatchTime', value)
  //   }

  //   if (key === 'lapA') {
  //     io.emit('lapA', value)
  //   }

  //   if (key === 'lapB') {
  //     io.emit('lapB', value)
  //   }

  //   if (key === 'lapC') {
  //     io.emit('lapC', value)
  //   }
  //   // io.emit('newIncomingMessage', { author: 'ARDUINO', message: data })
  // })

  httpServer.listen(port, () => {
    console.log(
      `> Ready on http://${hostname}:${port} http://${netsResults.en0[0]}:${port}`
    )
  })
})
