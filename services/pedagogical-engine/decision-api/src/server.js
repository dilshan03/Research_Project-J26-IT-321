import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix for Node.js DNS SRV query ECONNREFUSED on local ISP resolvers
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { connectToDatabase } from '@mathquest/db';
import telemetryRoutes from './routes/telemetryRoutes.js';
import { initInteractionIndexes } from './models/interactionModel.js';
import { ensureLocalStorage } from './controllers/telemetryController.js';

// Load environment variables from project root (.env)
dotenv.config({
  path: new URL('../../../../.env', import.meta.url)
});

const app = express();
const PORT = process.env.PEDAGOGICAL_DECISION_PORT || 5002;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Telemetry & Pedagogical Routes
app.use('/api/telemetry', telemetryRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'MathQuest Pedagogical Decision API',
    status: 'ONLINE',
    port: PORT
  });
});

// Database Health Check Endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const ping = await db.command({ ping: 1 });
    res.json({
      success: true,
      message: 'MongoDB Atlas connection active.',
      ping
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database connection offline (local fallback active).',
      error: err.message
    });
  }
});

// Start Server
async function startServer() {
  ensureLocalStorage();

  let isDatabaseConnected = false;
  try {
    const db = await connectToDatabase();
    await initInteractionIndexes();
    isDatabaseConnected = true;
    console.log(`[MongoDB] Connected to MongoDB Atlas for Research Telemetry`);
  } catch (err) {
    console.warn(`[MongoDB Warning] Atlas connection unavailable (${err.message}). Local fallback enabled.`);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Pedagogical Decision API running on http://localhost:${PORT}`);
    console.log(`📊 Mode: ${isDatabaseConnected ? 'MongoDB Atlas (Online)' : 'Local File Persistence (Offline Fallback)'}`);
    console.log(`=======================================================`);
  });
}

startServer();
