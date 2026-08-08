import { Router } from 'express'
import { createDevice } from '../controllers/devices.controller.js'
import { requireFarmOwner } from '../middleware/firebaseAuth.js'

const router = Router()

router.post('/', requireFarmOwner, createDevice)

export default router
