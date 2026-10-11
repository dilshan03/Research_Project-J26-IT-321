import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@mathquest/db';

/**
 * Returns the users collection from MongoDB Atlas.
 */
export async function getUsersCollection() {
    const db = await connectToDatabase();
    return db.collection('users');
}

/**
 * Returns the sessions collection from MongoDB Atlas.
 */
export async function getSessionsCollection() {
    const db = await connectToDatabase();
    return db.collection('sessions');
}

/**
 * Initializes database indexes for users and sessions collections.
 */
export async function initDatabaseIndexes() {
    try {
        const users = await getUsersCollection();
        await users.createIndex({ email: 1 }, { unique: true });

        const sessions = await getSessionsCollection();
        await sessions.createIndex({ sessionId: 1 }, { unique: true });
        // TTL index to automatically remove expired sessions
        await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

        console.log('MongoDB indexes initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize MongoDB indexes:', error.message);
        throw error;
    }
}

/**
 * Formats a raw MongoDB user document into a safe public user representation.
 */
export function toPublicUser(userDoc) {
    if (!userDoc) return null;
    return {
        id: userDoc._id ? userDoc._id.toString() : '',
        fullName: userDoc.fullName,
        email: userDoc.email,
        role: userDoc.role,
        username: userDoc.username || userDoc.email.split('@')[0],
    };
}

/**
 * Finds a user by normalized email address.
 */
export async function findUserByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const users = await getUsersCollection();
    return users.findOne({ email: normalizedEmail });
}

/**
 * Finds a user by their MongoDB _id.
 */
export async function findUserById(id) {
    if (!id) return null;
    try {
        const objectId = typeof id === 'string' ? new ObjectId(id) : id;
        const users = await getUsersCollection();
        return users.findOne({ _id: objectId });
    } catch {
        return null;
    }
}

/**
 * Persists a new user record in the users collection.
 */
export async function createUser({ role, fullName, email, passwordHash, username, acceptedTerms }) {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    const userDoc = {
        role,
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        username: username ? username.trim() : normalizedEmail.split('@')[0],
        acceptedTerms: Boolean(acceptedTerms),
        createdAt: now,
        updatedAt: now,
    };

    const users = await getUsersCollection();
    const result = await users.insertOne(userDoc);
    return { ...userDoc, _id: result.insertedId };
}

/**
 * Creates and stores a new authenticated session in MongoDB.
 */
export async function createSession({ userId, rememberMe }) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const durationMs = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000;      // 1 day
    const expiresAt = new Date(Date.now() + durationMs);

    const sessionDoc = {
        sessionId,
        userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
        rememberMe: Boolean(rememberMe),
        createdAt: new Date(),
        expiresAt,
    };

    const sessions = await getSessionsCollection();
    await sessions.insertOne(sessionDoc);

    return {
        sessionId,
        expiresAt,
        durationMs,
    };
}

/**
 * Finds an active (unexpired) session by sessionId.
 */
export async function findSession(sessionId) {
    if (!sessionId) return null;
    const sessions = await getSessionsCollection();
    return sessions.findOne({
        sessionId,
        expiresAt: { $gt: new Date() },
    });
}

/**
 * Deletes a session from the database.
 */
export async function deleteSession(sessionId) {
    if (!sessionId) return;
    const sessions = await getSessionsCollection();
    await sessions.deleteOne({ sessionId });
}
