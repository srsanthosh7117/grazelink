import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error(err.message, { details: err.details })
    return res.status(err.statusCode).json({ success: false, error: err.message, details: err.details })
  }

  // express.json() throws a plain SyntaxError (with a `body` marker
  // property) when the request body isn't valid JSON — that's a client
  // mistake, not a server fault, so it should be a 400, not a 500.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON in request body.' })
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack })
  res.status(500).json({ success: false, error: 'Internal server error.' })
}
