const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getChannel, setupQueues, sendLinksToQueue, cleanupQueues } = require('../services/queue')
const { setupResultConsumer } = require('../services/queue/consumer')

const router = express.Router()

router.post('/scrapWebsite', async (req, res) => {
  const requestStart = Date.now()
  console.log(`[${requestStart}] Received scraping request:`, {
    linksCount: req.body.links?.split(',').length || 0,
    domains: req.body.domains?.length || 0,
    extractOptions: req.body.extractOptions,
  })

  if (!getChannel()) {
    console.error('RabbitMQ channel not ready')
    return res.status(503).json({ error: 'Service unavailable - RabbitMQ connection not ready' })
  }

  const { links, domains, extractOptions } = req.body
  if (!links) {
    console.error('No links provided in request')
    return res.status(400).json({ error: 'Links are required' })
  }

  const requestId = uuidv4()
  const queueName = 'scraping_queue'
  const resultQueue = `result_queue_${requestId}`

  console.log(`[${Date.now()}] Processing request ${requestId}`)

  try {
    await setupQueues(queueName, resultQueue)

    const linkArray = links
      .split(',')
      .map((link) => link.trim())
      .filter(Boolean)

    if (linkArray.length === 0) {
      return res.status(400).json({ error: 'No valid links provided' })
    }

    console.log(`[${Date.now()}] Processing ${linkArray.length} links`)

    // Start result consumer before sending messages
    const resultPromise = setupResultConsumer(resultQueue, linkArray.length)

    // Send all links to queue
    await sendLinksToQueue(linkArray, queueName, requestId, resultQueue, domains, extractOptions)

    // Wait for results
    const results = await resultPromise

    // Cleanup
    await cleanupQueues(queueName, resultQueue)

    const totalTime = Date.now() - requestStart
    const successCount = results.filter((r) => !r.error).length
    const errorCount = results.length - successCount

    console.log(
      `[${Date.now()}] Request ${requestId} completed in ${totalTime}ms - Success: ${successCount}, Errors: ${errorCount}`
    )

    res.json({
      results,
      stats: {
        total: linkArray.length,
        successful: successCount,
        failed: errorCount,
        processingTime: totalTime,
      },
    })
  } catch (error) {
    const totalTime = Date.now() - requestStart
    console.error(
      `[${Date.now()}] Request ${requestId} failed after ${totalTime}ms:`,
      error.message
    )

    try {
      await cleanupQueues(queueName, resultQueue)
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message)
    }

    res.status(500).json({
      error: error.message,
      processingTime: totalTime,
    })
  }
})

// Health check with queue status
router.get('/health', (req, res) => {
  const channel = getChannel()
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    worker: process.pid,
    queueConnected: !!channel,
  })
})

module.exports = router
