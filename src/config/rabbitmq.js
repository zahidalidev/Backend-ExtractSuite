const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'scraping_queue';
const RABBITMQ_OPTIONS = {
    credentials: require('amqplib').credentials.plain(
        process.env.RABBITMQ_USERNAME || 'guest',
        process.env.RABBITMQ_PASSWORD || 'guest'
    )
};

module.exports = {
    AMQP_URL,
    QUEUE_NAME,
    RABBITMQ_OPTIONS
};
