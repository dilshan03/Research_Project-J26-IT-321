import { Router } from 'express';
import {
  recordInteraction,
  getInteractions,
  getLearnerState,
  evaluateLearnerState,
  calculateBKTStep,
  getBKTMasteryTrajectory,
  evaluateFSMDecision,
  getFSMRules,
  upsertStudentProgress,
  getStudentProgress
} from '../controllers/telemetryController.js';

const router = Router();

// Persist an interaction log event
router.post('/interactions', recordInteraction);

// Query interaction logs
router.get('/interactions', getInteractions);

// Persist or update per-(parentId, learnerId) student progress & mastery
router.post('/student-progress', upsertStudentProgress);

// Fetch per-(parentId, learnerId) student progress & mastery
router.get('/student-progress', getStudentProgress);

// Fetch real-time learner state computed from persistent logs
router.get('/learner-state', getLearnerState);

// Evaluate learner state on-the-fly for a provided array of events
router.post('/learner-state/evaluate', evaluateLearnerState);

// Execute a single Hint-Aware BKT knowledge update step
router.post('/bkt/step', calculateBKTStep);

// Query student knowledge mastery progression trajectory
router.get('/bkt/trajectory', getBKTMasteryTrajectory);

// Evaluate FSM decision rules based on current student context
router.post('/fsm/evaluate', evaluateFSMDecision);

// Query catalog of all declarative FSM pedagogical rules
router.get('/fsm/rules', getFSMRules);

export default router;
