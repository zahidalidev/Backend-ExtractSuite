const serverless = require('serverless-http');
const app = require('./src/app');
const { connectQueue } = require('./src/services/queue');

let connection;

const handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    
    if (!connection) {
        connection = await connectQueue();
    }
    
    const serverlessHandler = serverless(app);
    return await serverlessHandler(event, context);
};

module.exports = { handler };


// Export the Lambda handlermodule.exports.handler = handler;// const { connectQueue, setupQueues, sendLinksToQueue } = require('./src/services/queue');
// const { extractWebsiteInformation } = require('./src/utils/helpers/htmlParser');

// exports.handler = async (event, context) => {
//   try {
//     await connectQueue();
//     // Your existing queue and parsing logic here
//     return {
//       statusCode: 200,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify({
//         message: 'Processing complete'
//       })
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       },
//       body: JSON.stringify({
//         message: 'Internal Server Error'
//       })
//     };
//   }
// };
