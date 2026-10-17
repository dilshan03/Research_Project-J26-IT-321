import { connectToDatabase } from '@mathquest/db';

const COLLECTION_NAME = 'pedagogical_interactions';

/**
 * Save an interaction telemetry event to MongoDB
 */
export async function saveInteractionLog(logData) {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const document = {
    ...logData,
    receivedAt: new Date(),
    timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date()
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

/**
 * Retrieve interaction logs by studentId or sessionId
 */
export async function getInteractionLogs({ studentId, sessionId, limit = 100 }) {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const query = {};
  if (studentId) query.studentId = studentId;
  if (sessionId) query.sessionId = sessionId;

  return await collection
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Initialize indexes for fast research telemetry queries
 */
export async function initInteractionIndexes() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    await collection.createIndex({ studentId: 1, timestamp: -1 });
    await collection.createIndex({ sessionId: 1 });
    await collection.createIndex({ questionId: 1 });

    console.log('[MongoDB] Pedagogical Interaction indexes initialized successfully.');
  } catch (err) {
    console.warn('[MongoDB] Index creation warning:', err.message);
  }
}
