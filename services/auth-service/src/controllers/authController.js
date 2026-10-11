import bcrypt from 'bcryptjs';
import {
    createUser,
    findUserByEmail,
    findUserById,
    createSession,
    findSession,
    deleteSession,
    toPublicUser,
} from '../models/userModel.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const VALID_ROLES = ['parent', 'teacher'];

/**
 * Validates registration input against requirements.
 */
function validateRegistrationInput({ role, fullName, email, password, acceptedTerms }) {
    const fieldErrors = {};

    if (!role || !VALID_ROLES.includes(role)) {
        fieldErrors.role = 'Role must be either parent or teacher.';
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        fieldErrors.fullName = 'Please enter a valid full name (at least 2 characters).';
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        fieldErrors.email = 'Please enter a valid email address.';
    }

    if (!password || typeof password !== 'string') {
        fieldErrors.password = 'Password is required.';
    } else if (password.length < 8) {
        fieldErrors.password = 'Password must be at least 8 characters long.';
    } else if (!PASSWORD_REGEX.test(password)) {
        fieldErrors.password = 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.';
    }

    if (!acceptedTerms) {
        fieldErrors.acceptedTerms = 'You must accept the Terms of Service & Privacy Policy.';
    }

    return fieldErrors;
}

/**
 * POST /api/auth/sign-up
 * Registers a new parent or teacher user and persists their document to MongoDB Atlas.
 */
export async function signUp(req, res) {
    try {
        const { role, fullName, email, password, acceptedTerms } = req.body || {};

        // 1. Validation
        const fieldErrors = validateRegistrationInput({ role, fullName, email, password, acceptedTerms });
        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: Object.values(fieldErrors)[0],
                error: {
                    message: Object.values(fieldErrors)[0],
                    fieldErrors,
                },
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Check if user already exists
        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists.',
                error: {
                    message: 'An account with this email address already exists.',
                    code: 'EMAIL_ALREADY_EXISTS',
                },
            });
        }

        // 3. Hash password securely
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Persist user document to MongoDB Atlas
        let newUser;
        try {
            newUser = await createUser({
                role,
                fullName,
                email: normalizedEmail,
                passwordHash,
                acceptedTerms: true,
            });
        } catch (dbError) {
            // Handle race condition duplicate key error from MongoDB unique index
            if (dbError.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email address already exists.',
                    error: {
                        message: 'An account with this email address already exists.',
                        code: 'EMAIL_ALREADY_EXISTS',
                    },
                });
            }
            throw dbError;
        }

        // 5. Respond with public user representation (never return passwordHash)
        const publicUser = toPublicUser(newUser);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                user: publicUser,
            },
        });
    } catch (error) {
        console.error('Error during user registration:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred during registration. Please try again.',
            error: {
                message: error.message,
            },
        });
    }
}

/**
 * POST /api/auth/sign-in
 * Authenticates user credentials against MongoDB Atlas and establishes a secure session.
 */
export async function signIn(req, res) {
    try {
        const { email, password, rememberMe } = req.body || {};

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email address and password are required.',
                error: {
                    message: 'Email address and password are required.',
                },
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Look up user by email
        const user = await findUserByEmail(normalizedEmail);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                error: {
                    message: 'Invalid email or password.',
                },
            });
        }

        // 2. Verify password with bcrypt
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                error: {
                    message: 'Invalid email or password.',
                },
            });
        }

        // 3. Establish authenticated session in MongoDB
        const session = await createSession({
            userId: user._id,
            rememberMe: Boolean(rememberMe),
        });

        // 4. Set HttpOnly session cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('mathquest_session', session.sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: session.durationMs,
            path: '/',
        });

        // 5. Return authenticated user's public info
        return res.status(200).json({
            success: true,
            message: 'Sign in successful.',
            data: {
                user: toPublicUser(user),
            },
        });
    } catch (error) {
        console.error('Error during sign in:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred during sign in. Please try again.',
            error: {
                message: error.message,
            },
        });
    }
}

/**
 * GET /api/auth/session
 * Verifies the current session cookie with MongoDB Atlas and returns the authenticated user.
 */
export async function getSession(req, res) {
    try {
        const sessionId = req.cookies?.mathquest_session;

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'No active session found.',
            });
        }

        // Find active session in MongoDB
        const session = await findSession(sessionId);
        if (!session) {
            res.clearCookie('mathquest_session', { path: '/' });
            return res.status(401).json({
                success: false,
                message: 'Session is invalid or has expired.',
            });
        }

        // Retrieve user
        const user = await findUserById(session.userId);
        if (!user) {
            await deleteSession(sessionId);
            res.clearCookie('mathquest_session', { path: '/' });
            return res.status(401).json({
                success: false,
                message: 'Associated user account was not found.',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Session verified successfully.',
            data: {
                user: toPublicUser(user),
            },
        });
    } catch (error) {
        console.error('Error verifying session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify session.',
            error: {
                message: error.message,
            },
        });
    }
}

/**
 * POST /api/auth/sign-out
 * Destroys session in MongoDB and clears the HTTP-only cookie.
 */
export async function signOut(req, res) {
    try {
        const sessionId = req.cookies?.mathquest_session;

        if (sessionId) {
            await deleteSession(sessionId);
        }

        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('mathquest_session', {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
        });

        return res.status(200).json({
            success: true,
            message: 'Signed out successfully.',
        });
    } catch (error) {
        console.error('Error during sign out:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to sign out cleanly.',
            error: {
                message: error.message,
            },
        });
    }
}
