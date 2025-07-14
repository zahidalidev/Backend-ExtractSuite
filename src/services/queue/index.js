const amqp = require('amqplib')
const { AMQP_URL } = require('../../config/rabbitmq')

let connection
let channel

async function connectQueue() {
  try {
    // Optimized connection settings
    connection = await amqp.connect(AMQP_URL, {
      heartbeat: 60,
      connectionTimeout: 30000,
    })

    channel = await connection.createChannel()

    // Optimized channel settings
    await channel.prefetch(50) // Global prefetch

    // Connection event handlers
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err)
      setTimeout(connectQueue, 5000)
    })

    connection.on('close', () => {
      console.log('RabbitMQ connection closed, reconnecting...')
      setTimeout(connectQueue, 5000)
    })

    console.log('Connected to RabbitMQ successfully')
  } catch (error) {
    console.error('RabbitMQ connection error:', error)
    setTimeout(connectQueue, 5000)
  }
}

async function setupQueues(queueName, resultQueue) {
  try {
    console.log(`Setting up queues - Result Queue: ${resultQueue}`)

    // Optimized result queue settings
    await channel.assertQueue(resultQueue, {
      durable: false, // Faster for temporary queues
      autoDelete: true,
      exclusive: false,
      arguments: {
        'x-message-ttl': 600000, // 10 minutes TTL
        'x-max-length': 10000,
      },
    })

    console.log('Queues setup completed successfully')
  } catch (error) {
    console.error('Error setting up queues:', error)
    throw error
  }
}

async function sendLinksToQueue(
  linkArray,
  queueName,
  requestId,
  resultQueue,
  domains,
  extractOptions
) {
  console.log(`Sending ${linkArray.length} links to queue ${queueName}`)

  const batchSize = 100 // Process in batches
  const batches = []

  for (let i = 0; i < linkArray.length; i += batchSize) {
    batches.push(linkArray.slice(i, i + batchSize))
  }

  // Send batches with slight delay to prevent overwhelming
  for (const [batchIndex, batch] of batches.entries()) {
    const promises = batch.map((link, index) => {
      const webDetails = {
        link,
        domains,
        extractOptions,
      }

      return channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify({ webDetails, requestId, resultQueue })),
        {
          persistent: true,
          priority: Math.floor(Math.random() * 10), // Random priority for load balancing
        }
      )
    })

    await Promise.allSettled(promises)

    // Small delay between batches to prevent overwhelming
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  console.log('All links sent to queue successfully')
}

async function cleanupQueues(queueName, resultQueue) {
  try {
    console.log(`Cleaning up queues: ${resultQueue}`)

    // Only cleanup result queue (scraping_queue is persistent)
    await channel.deleteQueue(resultQueue)
    console.log('Queues cleaned up successfully')
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

function getChannel() {
  return channel
}

function getConnection() {
  return connection
}

module.exports = {
  connectQueue,
  setupQueues,
  sendLinksToQueue,
  cleanupQueues,
  getChannel,
  getConnection,
}
