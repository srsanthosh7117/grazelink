import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

const server = app.listen(env.port, () => {
  logger.info(`GrazeLink backend listening on port ${env.port} (${env.nodeEnv})`)
})

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`)
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`)
})
