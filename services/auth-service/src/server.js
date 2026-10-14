import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectToDatabase } from '@mathquest/db';
import authRoutes from './routes/authRoutes.js';
import { initDatabaseIndexes } from './models/userModel.js';

// Load environment variables from project root
dotenv.config({
    path: new URL('../../../.env', import.meta.url),
});

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5000;

// CORS configuration supporting cookies and local development origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
}));

// Middlewares
app.use(cookieParser());
app.use(express.json());

// Authentication routes
app.use('/api/auth', authRoutes);

// Check whether the backend is running
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MathQuest Authentication Service is running.',
    });
});

// Check MongoDB connection
app.get('/api/health/database', async (req, res) => {
    try {
        const db = await connectToDatabase();
        await db.command({ ping: 1 });

        res.json({
            success: true,
            message: 'MongoDB Atlas connection successful.',
        });
    } catch (error) {
        console.error('Database connection failed:', error.message);

        res.status(503).json({
            success: false,
            message: 'Database connection unavailable.',
        });
    }
});

// Start backend
async function startServer() {
    try {
        await connectToDatabase();
        await initDatabaseIndexes();

        app.listen(PORT, () => {
            console.log(`MathQuest Auth Service running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start authentication service:', error.message);
        process.exit(1);
    }
}

startServer();
