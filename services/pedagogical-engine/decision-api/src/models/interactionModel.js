import { connectToDatabase } from '@mathquest/db';

const COLLECTION_NAME = 'pedagogical_interactions';
const PROGRESS_COLLECTION_NAME = 'pedagogical_student_progress';

/**
 * Save an interaction telemetry event to MongoDB (keyed with parentId & studentId/learnerId)
 */
export async function saveInteractionLog(logData) {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const normalizedStudentId = logData.studentId || logData.learnerId || 'student_unknown';
  const normalizedParentId = logData.parentId || 'parent_unknown';

  // Normalize optional remainingTimeMs -> responseTimeMs if responseTimeMs is not explicitly set
  const computedResponseTimeMs =
    typeof logData.responseTimeMs === 'number'
      ? logData.responseTimeMs
      : typeof logData.timeLimitMs === 'number' && typeof logData.remainingTimeMs === 'number'
        ? Math.max(0, logData.timeLimitMs - logData.remainingTimeMs)
        : undefined;

  const cameraPermissionGranted = Boolean(
    logData.cameraPermissionGranted ?? logData.cameraPermission ?? false
  );
  const cameraAttentionScore =
    cameraPermissionGranted && typeof logData.cameraAttentionScore === 'number'
      ? Math.max(0, Math.min(1, logData.cameraAttentionScore))
      : null;

  const document = {
    ...logData,
    ...(computedResponseTimeMs !== undefined ? { responseTimeMs: computedResponseTimeMs } : {}),
    cameraPermissionGranted,
    cameraAttentionScore,
    studentId: normalizedStudentId,
    learnerId: logData.learnerId || normalizedStudentId,
    parentId: normalizedParentId,
    receivedAt: new Date(),
    timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date()
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

/**
 * Retrieve interaction logs by parentId, studentId/learnerId, or sessionId
 */
export async function getInteractionLogs({ parentId, studentId, learnerId, sessionId, limit = 100 }) {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const query = {};
  if (parentId) query.parentId = parentId;
  if (studentId || learnerId) query.studentId = studentId || learnerId;
  if (sessionId) query.sessionId = sessionId;

  return await collection
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Save or update cumulative student progress for a specific (parentId, studentId/learnerId) pair
 */
export async function saveStudentProgressRecord(progressData) {
  const db = await connectToDatabase();
  const collection = db.collection(PROGRESS_COLLECTION_NAME);

  const parentId = progressData.parentId || 'parent_unknown';
  const studentId = progressData.learnerId || progressData.studentId || 'student_unknown';

  const filter = { parentId, studentId };
  const updateDoc = {
    $set: {
      ...progressData,
      parentId,
      studentId,
      learnerId: studentId,
      updatedAt: new Date()
    }
  };

  await collection.updateOne(filter, updateDoc, { upsert: true });
  return await collection.findOne(filter);
}

/**
 * Retrieve saved student progress by (parentId, studentId/learnerId)
 */
export async function getStudentProgressRecord({ parentId, studentId, learnerId }) {
  const db = await connectToDatabase();
  const collection = db.collection(PROGRESS_COLLECTION_NAME);

  const query = {};
  if (parentId) query.parentId = parentId;
  if (studentId || learnerId) query.studentId = studentId || learnerId;

  return await collection.findOne(query);
}

/**
 * Initialize indexes for fast research telemetry queries
 */
export async function initInteractionIndexes() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const progressCollection = db.collection(PROGRESS_COLLECTION_NAME);

    await collection.createIndex({ parentId: 1, studentId: 1, timestamp: -1 });
    await collection.createIndex({ studentId: 1, timestamp: -1 });
    await collection.createIndex({ sessionId: 1 });
    await collection.createIndex({ questionId: 1 });

    await progressCollection.createIndex({ parentId: 1, studentId: 1 }, { unique: true });

    console.log('[MongoDB] Pedagogical Interaction & Student Progress indexes initialized successfully.');
  } catch (err) {
    console.warn('[MongoDB] Index creation warning:', err.message);
  }
}
