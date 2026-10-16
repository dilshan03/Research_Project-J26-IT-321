import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix for Node.js DNS SRV query ECONNREFUSED on local ISP resolvers
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { connectToDatabase } from '@mathquest/db';
import { saveInteractionLog, getInteractionLogs, initInteractionIndexes } from './models/interactionModel.js';

// Load environment variables from project root (.env)
dotenv.config({
  path: new URL('../../../../.env', import.meta.url)
});

const app = express();
const PORT = process.env.PEDAGOGICAL_DECISION_PORT || 5002;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'MathQuest Pedagogical Decision API',
    status: 'ONLINE',
    port: PORT
  });
});

/**
 * POST /api/telemetry/interactions
 * Primary endpoint called by useInteractionLogger to persist telemetry in MongoDB
 */
app.post('/api/telemetry/interactions', async (req, res) => {
  try {
    const logData = req.body;

    if (!logData || !logData.eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: eventType'
      });
    }

    // Attempt MongoDB save first, fallback to JSON file if Atlas is offline
    let recordId = 'local_' + Date.now();
    try {
      if (isDatabaseConnected) {
        const savedRecord = await saveInteractionLog(logData);
        recordId = savedRecord._id;
      } else {
        throw new Error('Database is in offline fallback mode');
      }
    } catch (dbErr) {
      // Save locally to JSON file
      const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
      const list = JSON.parse(raw || '[]');
      const doc = {
        ...logData,
        _id: recordId,
        receivedAt: new Date().toISOString()
      };
      list.push(doc);
      fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify(list, null, 2));
    }

    console.log(`[Telemetry Saved] Event: ${logData.eventType} | Student: ${logData.studentId} | Correct: ${logData.isCorrect ?? '-'}`);

    res.status(201).json({
      success: true,
      message: 'Telemetry interaction persisted successfully.',
      recordId
    });
  } catch (error) {
    console.error('Failed to save interaction telemetry:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telemetry/interactions
 * Query research logs for training & evaluation
 */
app.get('/api/telemetry/interactions', async (req, res) => {
  try {
    const { studentId, sessionId, limit = 100 } = req.query;

    if (isDatabaseConnected) {
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
    }

    // Read from local JSON storage fallback
    const raw = fs.readFileSync(LOCAL_STORAGE_PATH, 'utf-8');
    let logs = JSON.parse(raw || '[]');

    if (studentId) logs = logs.filter((l) => l.studentId === studentId);
    if (sessionId) logs = logs.filter((l) => l.sessionId === sessionId);

    logs = logs.slice(-parseInt(limit, 10)).reverse();

    res.json({
      success: true,
      source: 'Local Storage Fallback',
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Failed to retrieve interaction telemetry:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Local file-system telemetry persistence fallback
const LOCAL_STORAGE_PATH = fileURLToPath(new URL('../data/pedagogical_interactions.json', import.meta.url));

function ensureLocalStorage() {
  const dir = path.dirname(LOCAL_STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
    fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify([], null, 2));
  }
}

let isDatabaseConnected = false;

// Start Server
async function startServer() {
  ensureLocalStorage();

  try {
    await connectToDatabase();
    await initInteractionIndexes();
    isDatabaseConnected = true;
    console.log(`📁 Connected to MongoDB Database for Research Telemetry`);
  } catch (err) {
    console.warn(`⚠️ MongoDB Atlas unavailable (${err.message}). Using local JSON fallback: ${LOCAL_STORAGE_PATH}`);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Pedagogical Decision API running on http://localhost:${PORT}`);
    console.log(`📊 Mode: ${isDatabaseConnected ? 'MongoDB Atlas' : 'Local File Persistence (Offline Resilient)'}`);
    console.log(`=======================================================`);
  });
}

startServer();
