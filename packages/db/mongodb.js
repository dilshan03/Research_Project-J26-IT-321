
import { MongoClient } from 'mongodb';

let client;
let database;
let connectionPromise;

export async function connectToDatabase() {
    if (database) {
        return database;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'mathquest_db';

    if (!uri) {
        throw new Error('MONGODB_URI is not configured.');
    }

    connectionPromise = (async () => {
        const newClient = new MongoClient(uri);

        try {
            await newClient.connect();

            const db = newClient.db(dbName);
            await db.command({ ping: 1 });

            client = newClient;
            database = db;

            console.log('Successfully connected to MongoDB Atlas');

            return database;
        } catch (error) {
            await newClient.close();
            throw error;
        }
    })();

    try {
        return await connectionPromise;
    } finally {
        connectionPromise = null;
    }
}

export async function closeDatabaseConnection() {
    if (connectionPromise) {
        await connectionPromise.catch(() => { });
    }

    if (client) {
        await client.close();
    }

    client = undefined;
    database = undefined;
}
