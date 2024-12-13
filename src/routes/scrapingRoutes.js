const express = require('express')
const { v4: uuidv4 } = require('uuid')
const {
  getChannel,
  setupQueues,
  sendLinksToQueue,
  cleanupQueues,
} = require('../services/rabbitmqService')
const { setupResultConsumer } = require('../services/scrapingService')

const router = express.Router()

router.post('/scrapWebsite', async (req, res) => {
  console.log('Received scraping request:', req.body)

  if (!getChannel()) {
    console.error('RabbitMQ channel not ready')
    return res.status(503).json({ error: 'Service unavailable - RabbitMQ connection not ready' })
  }

  const { links } = req.body
  if (!links) {
    console.error('No links provided in request')
    return res.status(400).json({ error: 'Links are required' })
  }

  const requestId = uuidv4()
  const queueName = 'scraping_queue'
  const resultQueue = `result_queue_${requestId}`

  console.log(`Processing request ${requestId}`)

  try {
    await setupQueues(queueName, resultQueue)



    const linkArray = links.split(',').map((link) => link.trim())


    console.log(`Processing ${linkArray.length} links`)

    const resultPromise = setupResultConsumer(resultQueue, linkArray.length)
    await sendLinksToQueue(linkArray, queueName, requestId, resultQueue)

    const results = await resultPromise
    await cleanupQueues(queueName, resultQueue)

    console.log(`Request ${requestId} completed successfully`)
    res.json({ results })
  } catch (error) {
    console.error(`Request ${requestId} failed:`, error)
    await cleanupQueues(queueName, resultQueue)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
