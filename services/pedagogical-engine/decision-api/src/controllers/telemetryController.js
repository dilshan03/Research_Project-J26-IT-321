import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveInteractionLog, getInteractionLogs } from '../models/interactionModel.js';

// Local file-system telemetry persistence fallback path
const LOCAL_STORAGE_PATH = fileURLToPath(new URL('../../data/pedagogical_interactions.json', import.meta.url));

/**
 * Ensures the fallback data directory and JSON file exist.
 */
export function ensureLocalStorage() {
  const dir = path.dirname(LOCAL_STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
    fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify([], null, 2));
  }
}

/**
 * Append log to local fallback storage
 */
function saveToLocalStorage(logData, recordId) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
  const list = JSON.parse(raw || '[]');
  const doc = {
    ...logData,
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
function readFromLocalStorage({ studentId, sessionId, limit = 100 }) {
  ensureLocalStorage();
  const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
  let logs = JSON.parse(raw || '[]');

  if (studentId) logs = logs.filter((l) => l.studentId === studentId);
  if (sessionId) logs = logs.filter((l) => l.sessionId === sessionId);

  return logs.slice(-parseInt(limit, 10)).reverse();
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

    console.log(`[Telemetry Saved] Event: ${logData.eventType} | Student: ${logData.studentId} | Storage: ${storageTarget} | Correct: ${logData.isCorrect ?? '-'}`);

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
    const { studentId, sessionId, limit = 100 } = req.query;

    try {
      const logs = await getInteractionLogs({
        studentId,
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
    const logs = readFromLocalStorage({ studentId, sessionId, limit });

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
