import { Router } from 'express';
import { recordInteraction, getInteractions } from '../controllers/telemetryController.js';

const router = Router();

// Persist an interaction log event
router.post('/interactions', recordInteraction);

// Query interaction logs
router.get('/interactions', getInteractions);

export default router;
