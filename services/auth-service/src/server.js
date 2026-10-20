
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';

// Fix for Node.js DNS SRV query issues with local ISP resolvers
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { connectToDatabase } from '@mathquest/db';
import authRoutes from './routes/authRoutes.js';
import { initDatabaseIndexes } from './models/userModel.js';

// Load environment variables from the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: path.resolve(__dirname, '../../../.env'),
});

// Initialize Express
const app = express();

const PORT = process.env.AUTH_SERVICE_PORT || 5000;

// Allowed frontend origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Middlewares
app.use(cookieParser());
app.use(express.json());

// Authentication routes
app.use('/api/auth', authRoutes);

// Health check - Authentication service
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MathQuest Authentication Service is running.',
    });
});

// Health check - MongoDB database
app.get('/api/health/database', async (req, res) => {
    try {
        const db = await connectToDatabase();

        await db.command({ ping: 1 });

        res.json({
            success: true,
            message: 'MongoDB Atlas connection successful.',
        });
    } catch (error) {
        console.error(
            'Database connection failed:',
            error.message
        );

        res.status(503).json({
            success: false,
            message: 'Database connection unavailable.',
        });
    }
});

// Start authentication service
async function startServer() {
    try {
        // Connect to MongoDB Atlas
        await connectToDatabase();

        // Initialize user database indexes
        await initDatabaseIndexes();

        // Start Express server
        app.listen(PORT, () => {
            console.log(
                `MathQuest Auth Service running on http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            'Failed to start authentication service:',
            error.message
        );

        process.exit(1);
    }
}

startServer();
