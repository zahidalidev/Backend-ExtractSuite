const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://admin:password@rabbitmq:5672'
const PORT = process.env.PORT || 5000

module.exports = {
  AMQP_URL,
  PORT,
}
