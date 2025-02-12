const express = require('express');
const cors = require('cors');
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const rateLimit = require('express-rate-limit')
// const { connectQueue, getChannel } = require('./services/queue')
// const { setupScrapingQueueConsumer } = require('./services/queue/consumer')
const scrapingRoutes = require('./routes/scrapWebsite')
const { PORT } = require('./config/rabbitmq')

// Only run clustering in production
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  // Fork workers based on CPU cores
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died Restarting...`)
    cluster.fork()
  })
} else {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }))

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000 // limit each IP to 1000 requests per windowMs
  })

  app.use(limiter)
  app.use(express.json({ limit: '50mb' })) // Increased payload limit
  // Health check endpoint
  app.get('/health', (req, res) => res.status(200).send('OK'))
  
  app.use('/api', scrapingRoutes)

  // Enhanced initialization
  // async function initialize() {
  //   try {
  //     await connectQueue()
  //     const channel = getChannel()
      
  //     if (channel) {
  //       // Configure queue with proper settings
  //       await channel.assertQueue('scraping_queue', {
  //         durable: true,
  //         deadLetterExchange: 'dlx',
  //         messageTtl: 24 * 60 * 60 * 1000, // 24 hours TTL
  //         maxLength: 1000000 // Max queue length
  //       })

  //       // Setup dead letter exchange
  //       await channel.assertExchange('dlx', 'direct', { durable: true })
  //       await channel.assertQueue('dead_letter_queue', { durable: true })
  //       await channel.bindQueue('dead_letter_queue', 'dlx', 'scraping_queue')

  //       // Prefetch control - process 100 messages at a time per consumer
  //       channel.prefetch(100)
        
  //       await setupScrapingQueueConsumer()
        
  //       console.log('Queue initialization completed')
  //     } else {
  //       console.error('Failed to initialize - channel not available')
  //       setTimeout(initialize, 10000)
  //     }
  //   } catch (error) {
  //     console.error('Initialization error:', error)
  //     setTimeout(initialize, 10000)
  //   }
  // }

  // Graceful shutdown
  // const shutdown = async () => {
  //   console.log('Shutting down gracefully...')
  //   const channel = getChannel()
  //   if (channel) {
  //     await channel.close()
  //   }
  //   process.exit(0)
  // }

  // process.on('SIGTERM', shutdown)
  // process.on('SIGINT', shutdown)

  // initialize()

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`)
  })
}