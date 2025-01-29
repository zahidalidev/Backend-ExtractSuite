const amqp = require('amqplib')
const { AMQP_URL } = require('../../config/rabbitmq')

let connection, channel

const RABBITMQ_OPTIONS = {
  url: process.env.RABBITMQ_URL || AMQP_URL
};

const connectQueue = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_OPTIONS.url);
    channel = await connection.createChannel();
    await channel.prefetch(1);
    console.log('Connected to CloudAMQP');
    return channel;
  } catch (error) {
    console.error('CloudAMQP connection error:', error);
    throw error;
  }
};


// const connectQueue = async () => {
//   try {
//     connection = await amqp.connect(AMQP_URL, RABBITMQ_OPTIONS)
//     channel = await connection.createChannel()
    
//     await channel.prefetch(1)
//     await channel.assertQueue(QUEUE_NAME, { durable: true })
    
//     // Reconnection logic
//     connection.on('error', handleConnectionError)
//     connection.on('close', handleConnectionClose)

//     return channel
//   } catch (error) {
//     console.error('RabbitMQ connection error:', error)
//     await handleConnectionError(error)
//   }
// }

// Add this helper function
const getOrCreateChannel = async () => {
  if (!channel) {
    channel = await connectQueue()
  }
  return channel
}

const setupQueues = async (channel, queueName) => {
  if (!channel) throw new Error('Channel not initialized')
  
  try {
    await channel.assertQueue('scraping_queue', { durable: true })
    await channel.assertQueue(queueName, { 
      durable: true,
      autoDelete: false,
      messageTtl: 24 * 60 * 60 * 1000
    })
    console.log('Worker status: Channel ready for scraping_queue')
    
    channel.consume('scraping_queue', async (msg) => {
      if (msg === null) return;
      
      console.log('Worker received message:', msg.content.toString())
      try {
        const link = msg.content.toString()
        const scrapedData = await scrapeWebsite(link)
        console.log('Scraped data:', scrapedData)
        
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(scrapedData)))
        console.log('Results published to result queue')
        
        channel.ack(msg)
      } catch (error) {
        console.error('Scraping error:', error)
        channel.nack(msg, false, true)
      }
    })
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
  try {
    const channel = await getOrCreateChannel();
    if (!channel) throw new Error('Failed to create channel');
    
    console.log(`Sending ${linkArray.length} links to queue ${queueName}`);

    const promises = linkArray.map((link, index) => {
      console.log(`Sending link ${index + 1}/${linkArray.length}: ${link}`);

      const webDetails = {
        link,
        domains,
        extractOptions,
      };

      return channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify({ webDetails, requestId, resultQueue })),
        { persistent: true }
      );
    });

    await Promise.all(promises);
    console.log("All links sent to queue successfully");
    return true;
  } catch (error) {
    console.error('Error sending links to queue:', error);
    throw error;
  }
}

async function cleanupQueues(queueName, resultQueue) {
  try {
    const channel = await getOrCreateChannel();
    if (!channel) throw new Error('Failed to create channel');
    
    console.log(`Cleaning up queues: ${queueName}, ${resultQueue}`);
    await channel.deleteQueue(resultQueue);
    console.log('Queues cleaned up successfully');
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

function getChannel() {
  return channel;
}

exports.handler = async (event, context) => {
  try {
    if (!event.body) {
      throw new Error('Missing request body');
    }
    
    const { linkArray, queueName, requestId, resultQueue, domains, extractOptions } = JSON.parse(event.body);
    
    if (!linkArray || !queueName || !requestId || !resultQueue) {
      throw new Error('Missing required parameters');
    }
    
    await connectQueue();
    await setupQueues(channel, resultQueue);
    await sendLinksToQueue(linkArray, queueName, requestId, resultQueue, domains, extractOptions);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Hello from Lambda..Links processed successfully',
        success: true
      })
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: error.message || 'Internal Server Error',
        success: false,
        error: error.stack
      })
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

module.exports = {
  connectQueue,
  setupQueues,
  sendLinksToQueue,
  cleanupQueues,
  getChannel,
}



// const amqp = require('amqplib')
// const { AMQP_URL } = require('../../config/rabbitmq')

// let channel

// async function connectQueue() {
//   try {
//     const connection = await amqp.connect(AMQP_URL)
//     channel = await connection.createChannel()
//     await channel.prefetch(1)
//     console.log('Connected to CloudAMQP successfully')
//   } catch (error) {
//     console.error('CloudAMQP connection error:', error)
//     setTimeout(connectQueue, 10000)
//   }
// }

// async function setupQueues(queueName, resultQueue) {
//   try {
//     console.log(`Setting up queues - Result Queue: ${resultQueue}`)
//     // Only setup the result queue since scraping_queue is handled in app.js
//     await channel.assertQueue(resultQueue, {
//       durable: true,
//       autoDelete: false, // Queue persists even after connection closes
//       messageTtl: 24 * 60 * 60 * 1000, // Messages expire after 24 hours
//     })
//     console.log('Queues setup completed successfully')
//   } catch (error) {
//     console.error('Error setting up queues:', error)
//     throw error
//   }
// }

// async function sendLinksToQueue(
//   linkArray,
//   queueName,
//   requestId,
//   resultQueue,
//   domains,
//   extractOptions
// ) {
//   console.log(`Sending ${linkArray.length} links to queue ${queueName}`)

//   const promises = linkArray.map((link, index) => {
//     console.log(`Sending link ${index + 1}/${linkArray.length}: ${link}`)

//     const webDetails = {
//       link,
//       domains,
//       extractOptions,
//     }

//     return channel.sendToQueue(
//       queueName,
//       Buffer.from(JSON.stringify({ webDetails, requestId, resultQueue })),
//       { persistent: true }
//     )
//   })

//   await Promise.all(promises)
//   console.log('All links sent to queue successfully')
// }

// async function cleanupQueues(queueName, resultQueue) {
//   try {
//     console.log(`Cleaning up queues: ${queueName}, ${resultQueue}`)
//     await channel.deleteQueue(resultQueue)
//     console.log('Queues cleaned up successfully')
//   } catch (error) {
//     console.error('Error setting up queues:', error)
//   }
// }

// function getChannel() {
//   return channel
// }

// module.exports = {
//   connectQueue,
//   setupQueues,
//   sendLinksToQueue,
//   cleanupQueues,
//   getChannel,
// }
