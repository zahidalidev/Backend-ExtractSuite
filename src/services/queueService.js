const amqp = require('amqplib')
const { AMQP_URL } = require('../config/constants')

let channel

async function connectQueue() {
  try {
    const connection = await amqp.connect(AMQP_URL)
    channel = await connection.createChannel()
    await channel.prefetch(1)
    console.log('Connected to RabbitMQ successfully')
  } catch (error) {
    console.error('RabbitMQ connection error:', error)
    setTimeout(connectQueue, 10000)
  }
}

async function setupQueues(queueName, resultQueue) {
  try {
    console.log(`Setting up queues - Queue: ${queueName}, Result Queue: ${resultQueue}`)
    await channel.assertQueue(queueName, {
      durable: true,
    })
    await channel.assertQueue(resultQueue, {
      durable: true,
      autoDelete: true,
    })
    console.log('Queues setup completed successfully')
  } catch (error) {
    console.error('Error setting up queues:', error)
    throw error
  }
}

// Export all the original functions and channel
module.exports = {
  channel,
  connectQueue,
  setupQueues,
  sendLinksToQueue,
  setupResultConsumer,
  cleanupQueues,
  processLink,
  setupScrapingQueueConsumer,
  initialize,
}
