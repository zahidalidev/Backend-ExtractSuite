const { getChannel } = require('./rabbitmqService')

function setupResultConsumer(resultQueue, totalLinks) {
  console.log(`Setting up consumer for ${resultQueue}, expecting ${totalLinks} results`)
  return new Promise((resolve, reject) => {
    const results = []
    let processedCount = 0
    const channel = getChannel()

    const timeoutId = setTimeout(() => {
      console.error(`Consumer timeout after 30s - Processed: ${processedCount}/${totalLinks}`)
      console.error('Current results:', JSON.stringify(results, null, 2))
      channel.cancel(consumerTag)
      reject(new Error(`Processing timeout - Received ${processedCount}/${totalLinks} results`))
    }, 30000)

    let consumerTag
    channel
      .consume(resultQueue, (msg) => {
        if (!msg) {
          console.warn('Received null message in consumer')
          return
        }

        try {
          const result = JSON.parse(msg.content.toString())
          console.log(`Processing message ${processedCount + 1}/${totalLinks}:`, result)
          results.push(result)
          processedCount++
          channel.ack(msg)

          if (processedCount === totalLinks) {
            console.log('All messages processed successfully')
            clearTimeout(timeoutId)
            channel.cancel(consumerTag)
            resolve(results)
          }
        } catch (error) {
          console.error('Message processing error:', error)
          console.error('Message content:', msg.content.toString())
          channel.nack(msg, false, false)
        }
      })
      .then(({ consumerTag: tag }) => {
        consumerTag = tag
        console.log(`Consumer started with tag: ${consumerTag}`)
      })
      .catch((error) => {
        console.error('Failed to setup consumer:', error)
        reject(error)
      })
  })
}

async function processLink(link) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return {
    link,
    status: 'completed',
    timestamp: new Date().toISOString(),
    data: `Processed ${link} successfully`,
  }
}

async function setupScrapingQueueConsumer() {
  const channel = getChannel()
  try {
    console.log('Setting up scraping queue consumer')
    await channel.prefetch(1)

    channel.consume('scraping_queue', async (data) => {
      if (!data) return

      try {
        const { link, requestId, resultQueue } = JSON.parse(data.content.toString())
        console.log(`Processing link: ${link} for request: ${requestId}`)

        const result = await processLink(link)

        await channel.sendToQueue(resultQueue, Buffer.from(JSON.stringify(result)), {
          persistent: true,
        })

        channel.ack(data)
        console.log(`Completed processing link: ${link}`)
      } catch (error) {
        console.error('Worker processing error:', error)
        channel.nack(data, false, false)
      }
    })

    console.log('Scraping queue consumer setup completed')
  } catch (error) {
    console.error('Worker setup error:', error)
    setTimeout(setupScrapingQueueConsumer, 10000)
  }
}

module.exports = {
  setupResultConsumer,
  processLink,
  setupScrapingQueueConsumer,
}
