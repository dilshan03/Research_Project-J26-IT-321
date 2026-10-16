import { Router } from 'express';
import {
  recordInteraction,
  getInteractions,
  getLearnerState,
  evaluateLearnerState,
  calculateBKTStep,
  getBKTMasteryTrajectory
} from '../controllers/telemetryController.js';

const router = Router();

// Persist an interaction log event
router.post('/interactions', recordInteraction);

// Query interaction logs
router.get('/interactions', getInteractions);

// Fetch real-time learner state computed from persistent logs
router.get('/learner-state', getLearnerState);

// Evaluate learner state on-the-fly for a provided array of events
router.post('/learner-state/evaluate', evaluateLearnerState);

// Execute a single Hint-Aware BKT knowledge update step
router.post('/bkt/step', calculateBKTStep);

// Query student knowledge mastery progression trajectory
router.get('/bkt/trajectory', getBKTMasteryTrajectory);

export default router;
