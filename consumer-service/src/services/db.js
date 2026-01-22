import pg from 'pg';
import env from '../config.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD
});

export const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS processed_events (
                id SERIAL PRIMARY KEY,
                message_id UUID UNIQUE NOT NULL,
                original_timestamp TIMESTAMP,
                processed_at TIMESTAMP,
                event_type VARCHAR(255),
                processed_data JSONB
            );
        `);
        logger.info("Database initialized");
    } finally {
        client.release();
    }
};

export const closeDb = async () => {
    await pool.end();
};

export const checkMessageExists = async (messageId) => {
    const res = await pool.query(
        'SELECT 1 FROM processed_events WHERE message_id = $1',
        [messageId]
    );
    return res.rowCount > 0;
};

export const saveProcessedData = async (messageId, originalTimestamp, eventType, processedData, processedAt) => {
    await pool.query(
        `INSERT INTO processed_events 
        (message_id, original_timestamp, event_type, processed_data, processed_at) 
        VALUES ($1, $2, $3, $4, $5)`,
        [messageId, originalTimestamp, eventType, processedData, processedAt]
    );
};
