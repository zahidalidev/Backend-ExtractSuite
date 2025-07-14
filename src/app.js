const express = require('express')
const cors = require('cors')
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const rateLimit = require('express-rate-limit')
const { connectQueue, getChannel } = require('./services/queue')
const { setupScrapingQueueConsumer } = require('./services/queue/consumer')
const scrapingRoutes = require('./routes/scrapWebsite')
const { PORT } = require('./config/rabbitmq')

// Optimize clustering for production
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  // Use all CPU cores for maximum performance
  const workerCount = Math.max(numCPUs, 4)

  console.log(`Starting ${workerCount} workers`)

  for (let i = 0; i < workerCount; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`)
    cluster.fork()
  })

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`)
  })
} else {
  const app = express()

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  )

  // Increased rate limiting for high throughput
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10000, // Increased from 1000
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use(limiter)
  app.use(express.json({ limit: '50mb' }))

  app.get('/health', (req, res) => res.status(200).send('OK'))
  app.use('/api', scrapingRoutes)

  async function initialize() {
    try {
      await connectQueue()
      const channel = getChannel()

      if (channel) {
        // Optimized queue configuration
        await channel.assertQueue('scraping_queue', {
          durable: true,
          deadLetterExchange: 'dlx',
          messageTtl: 24 * 60 * 60 * 1000,
          maxLength: 1000000,
          arguments: {
            'x-max-priority': 10, // Priority queue support
          },
        })

        await channel.assertExchange('dlx', 'direct', { durable: true })
        await channel.assertQueue('dead_letter_queue', { durable: true })
        await channel.bindQueue('dead_letter_queue', 'dlx', 'scraping_queue')

        // Increased prefetch for better throughput
        channel.prefetch(50) // Increased from 100 to process more concurrently

        await setupScrapingQueueConsumer()

        console.log(`Worker ${process.pid} - Queue initialization completed`)
      } else {
        console.error('Failed to initialize - channel not available')
        setTimeout(initialize, 5000) // Reduced retry time
      }
    } catch (error) {
      console.error('Initialization error:', error)
      setTimeout(initialize, 5000)
    }
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...')
    const channel = getChannel()
    if (channel) {
      await channel.close()
    }
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  initialize()

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`)
  })
}
