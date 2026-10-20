import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  saveInteractionLog,
  getInteractionLogs,
  saveStudentProgressRecord,
  getStudentProgressRecord
} from '../models/interactionModel.js';
import { buildLearnerState } from '../engine/learnerStateBuilder.js';
import { defaultBKT } from '../engine/bktEngine.js';
import { defaultFSM, FSM_RULES, FSM_STATES } from '../engine/fsmDecisionEngine.js';

// Local file-system telemetry persistence fallback paths
const LOCAL_STORAGE_PATH = fileURLToPath(new URL('../../data/pedagogical_interactions.json', import.meta.url));
const LOCAL_PROGRESS_PATH = fileURLToPath(new URL('../../data/pedagogical_student_progress.json', import.meta.url));

/**
 * Ensures the fallback data directory and JSON files exist.
 */
export function ensureLocalStorage() {
  const dir = path.dirname(LOCAL_STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
    fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(LOCAL_PROGRESS_PATH)) {
    fs.writeFileSync(LOCAL_PROGRESS_PATH, JSON.stringify([], null, 2));
  }
}

/**
 * Append log to local fallback storage
 */
function saveToLocalStorage(logData, recordId) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
  const list = JSON.parse(raw || '[]');
  const normalizedStudentId = logData.studentId || logData.learnerId || 'student_unknown';
  const normalizedParentId = logData.parentId || 'parent_unknown';
  const doc = {
    ...logData,
    studentId: normalizedStudentId,
    learnerId: logData.learnerId || normalizedStudentId,
    parentId: normalizedParentId,
    _id: recordId,
    receivedAt: new Date().toISOString()
  };
  list.push(doc);
  fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify(list, null, 2));
  return doc;
}

/**
 * Read logs from local fallback storage
 */
function readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit = 100 }) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
  let logs = JSON.parse(raw || '[]');

  const targetStudentId = studentId || learnerId;
  if (parentId) logs = logs.filter((l) => l.parentId === parentId);
  if (targetStudentId) {
    logs = logs.filter((l) => l.studentId === targetStudentId || l.learnerId === targetStudentId);
  }
  if (sessionId) logs = logs.filter((l) => l.sessionId === sessionId);

  return logs.slice(-parseInt(limit, 10)).reverse();
}

/**
 * Save or update student progress in local fallback JSON
 */
function saveProgressToLocalStorage(progressData) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_PROGRESS_PATH, 'utf-8');
  const list = JSON.parse(raw || '[]');
  const parentId = progressData.parentId || 'parent_unknown';
  const studentId = progressData.learnerId || progressData.studentId || 'student_unknown';

  const idx = list.findIndex((item) => item.parentId === parentId && item.studentId === studentId);
  const updatedDoc = {
    ...(idx >= 0 ? list[idx] : {}),
    ...progressData,
    parentId,
    studentId,
    learnerId: studentId,
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) {
    list[idx] = updatedDoc;
  } else {
    list.push(updatedDoc);
  }

  fs.writeFileSync(LOCAL_PROGRESS_PATH, JSON.stringify(list, null, 2));
  return updatedDoc;
}

/**
 * Read student progress from local fallback JSON
 */
function readProgressFromLocalStorage({ parentId, studentId, learnerId }) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_PROGRESS_PATH, 'utf-8');
  const list = JSON.parse(raw || '[]');
  const targetStudentId = studentId || learnerId;

  return (
    list.find(
      (item) =>
        (!parentId || item.parentId === parentId) &&
        (!targetStudentId || item.studentId === targetStudentId || item.learnerId === targetStudentId)
    ) || null
  );
}

/**
 * POST /api/telemetry/interactions
 * Handles persisting interaction telemetry from the frontend companion / exercises
 */
export async function recordInteraction(req, res) {
  try {
    const logData = req.body;

    if (!logData || !logData.eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: eventType'
      });
    }

    let recordId = 'local_' + Date.now();
    let storageTarget = 'MongoDB Atlas';

    try {
      const savedRecord = await saveInteractionLog(logData);
      recordId = savedRecord._id;
    } catch (dbErr) {
      console.warn('MongoDB save failed, using local storage fallback:', dbErr.message);
      saveToLocalStorage(logData, recordId);
      storageTarget = 'Local Storage Fallback';
    }

    console.log(
      `[Telemetry Saved] Event: ${logData.eventType} | Parent: ${logData.parentId || '-'} | Student: ${logData.studentId || logData.learnerId} | Storage: ${storageTarget} | Correct: ${logData.isCorrect ?? '-'}`
    );

    return res.status(201).json({
      success: true,
      message: 'Telemetry interaction persisted successfully.',
      storage: storageTarget,
      recordId
    });
  } catch (error) {
    console.error('Failed to save interaction telemetry:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/telemetry/interactions
 * Query research logs for training & evaluation
 */
export async function getInteractions(req, res) {
  try {
    const { parentId, studentId, learnerId, sessionId, limit = 100 } = req.query;

    try {
      const logs = await getInteractionLogs({
        parentId,
        studentId,
        learnerId,
        sessionId,
        limit: limit ? parseInt(limit, 10) : 100
      });

      return res.json({
        success: true,
        source: 'MongoDB Atlas',
        count: logs.length,
        logs
      });
    } catch (dbErr) {
      console.warn('MongoDB query failed, falling back to local storage:', dbErr.message);
    }

    // Fallback to local JSON storage
    const logs = readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit });

    return res.json({
      success: true,
      source: 'Local Storage Fallback',
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Failed to retrieve interaction telemetry:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/telemetry/learner-state
 * Fetches recent student interactions and computes real-time learner state metrics
 * (Inattention index, Frustration flag, Persistence score, Recommended Intervention)
 */
export async function getLearnerState(req, res) {
  try {
    const { parentId, studentId, learnerId, sessionId, limit = 20 } = req.query;

    let logs = [];
    try {
      logs = await getInteractionLogs({
        parentId,
        studentId,
        learnerId,
        sessionId,
        limit: parseInt(limit, 10) || 20
      });
    } catch (dbErr) {
      logs = readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit });
    }

    // If MongoDB returned no records (e.g. offline fallback used earlier), check fallback
    if (!logs || logs.length === 0) {
      logs = readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit });
    }

    const learnerState = buildLearnerState(logs);

    return res.json({
      success: true,
      parentId: parentId || null,
      studentId: studentId || learnerId || learnerState.studentId,
      interactionsAnalyzed: logs.length,
      learnerState
    });
  } catch (error) {
    console.error('Failed to compute learner state:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/telemetry/learner-state/evaluate
 * Evaluates an arbitrary array of telemetry interactions directly on demand
 */
export async function evaluateLearnerState(req, res) {
  try {
    const { interactions = [] } = req.body;
    const learnerState = buildLearnerState(interactions);

    return res.json({
      success: true,
      interactionsAnalyzed: interactions.length,
      learnerState
    });
  } catch (error) {
    console.error('Failed to evaluate interaction array:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/telemetry/bkt/step
 * Executes a single Hint-Aware BKT knowledge update step
 */
export function calculateBKTStep(req, res) {
  try {
    const { p_prior = 0.20, isCorrect, hintLevel = 0, inattentionIndex = 0.0 } = req.body;

    if (typeof isCorrect !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Missing required field: isCorrect (boolean)' });
    }

    const result = defaultBKT.updateStep({
      p_prior: parseFloat(p_prior),
      isCorrect,
      hintLevel: parseInt(hintLevel, 10) || 0,
      inattentionIndex: parseFloat(inattentionIndex) || 0.0
    });

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/telemetry/bkt/trajectory
 * Computes knowledge progression trajectory P(L_t) for a student
 */
export async function getBKTMasteryTrajectory(req, res) {
  try {
    const { parentId, studentId, learnerId, sessionId, limit = 100 } = req.query;

    let logs = [];
    try {
      logs = await getInteractionLogs({
        parentId,
        studentId,
        learnerId,
        sessionId,
        limit: parseInt(limit, 10) || 100
      });
    } catch (dbErr) {
      logs = readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit });
    }

    if (!logs || logs.length === 0) {
      logs = readFromLocalStorage({ parentId, studentId, learnerId, sessionId, limit });
    }

    // Ensure chronological order
    const chronological = [...logs].reverse();
    const trajectoryData = defaultBKT.predictTrajectory(chronological);

    return res.json({
      success: true,
      parentId: parentId || null,
      studentId: studentId || learnerId,
      ...trajectoryData
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/telemetry/student-progress
 * Persists cumulative student progress (stars, coins, BKT mastery, session stats) keyed by (parentId, studentId/learnerId)
 */
export async function upsertStudentProgress(req, res) {
  try {
    const progressData = req.body || {};
    const parentId = progressData.parentId || 'parent_unknown';
    const studentId = progressData.learnerId || progressData.studentId;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: learnerId or studentId'
      });
    }

    let storageTarget = 'MongoDB Atlas';
    let savedProgress = null;

    try {
      savedProgress = await saveStudentProgressRecord(progressData);
      saveProgressToLocalStorage(progressData);
    } catch (dbErr) {
      console.warn('MongoDB progress save failed, using local storage fallback:', dbErr.message);
      savedProgress = saveProgressToLocalStorage(progressData);
      storageTarget = 'Local Storage Fallback';
    }

    return res.json({
      success: true,
      storage: storageTarget,
      progress: savedProgress
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/telemetry/student-progress
 * Retrieves saved student progress for a specific (parentId, studentId/learnerId) pair
 */
export async function getStudentProgress(req, res) {
  try {
    const { parentId, studentId, learnerId } = req.query;
    let progress = null;

    try {
      progress = await getStudentProgressRecord({ parentId, studentId, learnerId });
    } catch (dbErr) {
      progress = readProgressFromLocalStorage({ parentId, studentId, learnerId });
    }

    if (!progress) {
      progress = readProgressFromLocalStorage({ parentId, studentId, learnerId });
    }

    return res.json({
      success: true,
      progress
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/telemetry/fsm/evaluate
 * Evaluates the Finite State Machine rules and returns the active pedagogical decision
 */
export function evaluateFSMDecision(req, res) {
  try {
    const context = req.body || {};
    const decisionResult = defaultFSM.evaluate(context);

    return res.json({
      success: true,
      ...decisionResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/telemetry/fsm/rules
 * Returns the catalog of all declarative FSM rules for research inspection
 */
export function getFSMRules(req, res) {
  try {
    const rulesList = FSM_RULES.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      targetState: r.targetState,
      action: r.action,
      animation: r.animation,
      messageSinhala: r.messageSinhala
    }));

    return res.json({
      success: true,
      states: Object.values(FSM_STATES),
      rulesCount: rulesList.length,
      rules: rulesList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

