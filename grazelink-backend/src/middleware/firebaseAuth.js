import admin from 'firebase-admin'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

/** Verifies the "Authorization: Bearer <Firebase ID token>" header sent
 * by the dashboard (the signed-in farm owner), and attaches the decoded
 * token (with .uid) to req.user. Use for any route that acts on a
 * specific farm's data on the owner's behalf. */
export const requireFarmOwner = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing or malformed Authorization header. Expected "Bearer <idToken>".')
  }

  try {
    req.user = await admin.auth().verifyIdToken(token)
  } catch {
    throw new ApiError(401, 'Invalid or expired session token.')
  }

  next()
})
