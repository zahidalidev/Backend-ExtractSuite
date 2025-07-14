const { getChannel } = require('.')
const { websiteScrappingService } = require('../scraping/web')

function setupResultConsumer(resultQueue, totalLinks) {
  console.log(`Setting up consumer for ${resultQueue}, expecting ${totalLinks} results`)

  return new Promise((resolve, reject) => {
    const results = []
    let processedCount = 0
    const channel = getChannel()

    // Reduced timeout for faster processing
    const timeoutId = setTimeout(() => {
      console.log(`Results collected so far: ${processedCount} out of ${totalLinks}`)
      console.error(`Consumer timeout after 5m - Processed: ${processedCount}/${totalLinks}`)
      channel.cancel(consumerTag)
      // Return partial results instead of rejecting
      resolve(results)
    }, 300000) // 5 minutes instead of 10

    let consumerTag
    channel
      .consume(
        resultQueue,
        (msg) => {
          if (!msg) {
            console.warn('Received null message in consumer')
            return
          }

          try {
            const result = JSON.parse(msg.content.toString())
            results.push(result)
            processedCount++
            channel.ack(msg)

            if (processedCount === totalLinks) {
              console.log(`All ${totalLinks} messages processed successfully`)
              clearTimeout(timeoutId)
              channel.cancel(consumerTag)
              resolve(results)
            }
          } catch (error) {
            console.error('Message processing error:', error)
            channel.nack(msg, false, false)
          }
        },
        {
          noAck: false,
          consumerTag: `consumer_${Date.now()}`,
        }
      )
      .then(({ consumerTag: tag }) => {
        consumerTag = tag
        console.log(`Consumer started with tag: ${consumerTag}`)
      })
      .catch((error) => {
        console.error('Failed to setup consumer:', error)
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function processLink(webDetails) {
  const startTime = Date.now()

  try {
    const scrapedData = await websiteScrappingService(webDetails, false)

    const processingTime = Date.now() - startTime
    console.log(`Processed ${webDetails.link} in ${processingTime}ms`)

    return {
      link: webDetails.link,
      processingTime,
      ...scrapedData,
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`Failed to process ${webDetails.link} in ${processingTime}ms:`, error.message)

    return {
      link: webDetails.link,
      processingTime,
      error: error.message,
      aboutList: [],
      contacts: [],
      addresses: [],
      companyServices: [],
      keyIndicators: [],
      socialLinks: {},
      logo: '',
    }
  }
}

async function setupScrapingQueueConsumer() {
  const channel = getChannel()
  try {
    console.log('Setting up scraping queue consumer')

    // Increased prefetch for better throughput
    await channel.prefetch(20) // Process 20 messages concurrently per worker

    channel.consume(
      'scraping_queue',
      async (data) => {
        if (!data) return

        const processingStart = Date.now()

        try {
          const { webDetails, requestId, resultQueue } = JSON.parse(data.content.toString())
          console.log(`[Worker ${process.pid}] Processing: ${webDetails.link}`)

          const result = await processLink(webDetails)

          await channel.sendToQueue(resultQueue, Buffer.from(JSON.stringify(result)), {
            persistent: true,
          })

          channel.ack(data)

          const totalTime = Date.now() - processingStart
          console.log(`[Worker ${process.pid}] Completed: ${webDetails.link} in ${totalTime}ms`)
        } catch (error) {
          const totalTime = Date.now() - processingStart
          console.error(
            `[Worker ${process.pid}] Error processing after ${totalTime}ms:`,
            error.message
          )

          // Send error result instead of just nacking
          try {
            const { webDetails, requestId, resultQueue } = JSON.parse(data.content.toString())
            const errorResult = {
              link: webDetails.link,
              error: error.message,
              processingTime: totalTime,
              aboutList: [],
              contacts: [],
              addresses: [],
              companyServices: [],
              keyIndicators: [],
              socialLinks: {},
              logo: '',
            }

            await channel.sendToQueue(resultQueue, Buffer.from(JSON.stringify(errorResult)), {
              persistent: true,
            })

            channel.ack(data)
          } catch (sendError) {
            console.error('Failed to send error result:', sendError.message)
            channel.nack(data, false, false)
          }
        }
      },
      {
        noAck: false,
      }
    )

    console.log(`Scraping queue consumer setup completed for worker ${process.pid}`)
  } catch (error) {
    console.error('Worker setup error:', error)
    setTimeout(setupScrapingQueueConsumer, 5000) // Faster retry
  }
}

module.exports = {
  setupResultConsumer,
  processLink,
  setupScrapingQueueConsumer,
}
