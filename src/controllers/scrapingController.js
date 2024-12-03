const { v4: uuidv4 } = require('uuid')
const rabbitmqService = require('../services/rabbitmqService')
const scrapingService = require('../services/scrapingService')
const { QUEUE_CONFIG } = require('../config/rabbitmq')

class ScrapingController {
  async scrapWebsite(req, res) {
    console.log('Received scraping request:', req.body)

    if (!rabbitmqService.getChannel()) {
      return res.status(503).json({ error: 'Service unavailable - RabbitMQ connection not ready' })
    }

    const { links } = req.body
    if (!links) {
      return res.status(400).json({ error: 'Links are required' })
    }

    const requestId = uuidv4()
    const resultQueue = `result_queue_${requestId}`

    try {
      await rabbitmqService.setupQueues(QUEUE_CONFIG.SCRAPING_QUEUE, resultQueue)
      const linkArray = links.split(',').map((link) => link.trim())

      const resultPromise = scrapingService.setupResultConsumer(resultQueue, linkArray.length)
      await rabbitmqService.sendLinksToQueue(
        linkArray,
        QUEUE_CONFIG.SCRAPING_QUEUE,
        requestId,
        resultQueue
      )

      const results = await resultPromise
      await rabbitmqService.cleanupQueues(QUEUE_CONFIG.SCRAPING_QUEUE, resultQueue)

      res.json({ results })
    } catch (error) {
      await rabbitmqService.cleanupQueues(QUEUE_CONFIG.SCRAPING_QUEUE, resultQueue)
      res.status(500).json({ error: error.message })
    }
  }
}

module.exports = new ScrapingController()
