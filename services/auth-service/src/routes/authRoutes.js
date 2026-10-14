import { Router } from 'express';
import {
    signUp,
    signIn,
    getSession,
    signOut,
} from '../controllers/authController.js';

const router = Router();

// Registration
router.post('/sign-up', signUp);

// Sign In
router.post('/sign-in', signIn);

// Current Session verification
router.get('/session', getSession);

// Sign Out
router.post('/sign-out', signOut);

export default router;
