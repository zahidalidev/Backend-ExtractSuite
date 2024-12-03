const amqp = require('amqplib')
const { AMQP_URL } = require('../config/rabbitmq')

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

async function sendLinksToQueue(linkArray, queueName, requestId, resultQueue) {
  console.log(`Sending ${linkArray.length} links to queue ${queueName}`)
  const promises = linkArray.map((link, index) => {
    console.log(`Sending link ${index + 1}/${linkArray.length}: ${link}`)
    return channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify({ link, requestId, resultQueue })),
      { persistent: true }
    )
  })
  await Promise.all(promises)
  console.log('All links sent to queue successfully')
}

async function cleanupQueues(queueName, resultQueue) {
  try {
    console.log(`Cleaning up queues: ${queueName}, ${resultQueue}`)
    await channel.deleteQueue(resultQueue)
    console.log('Queues cleaned up successfully')
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

function getChannel() {
  return channel
}

module.exports = {
  connectQueue,
  setupQueues,
  sendLinksToQueue,
  cleanupQueues,
  getChannel,
}
