import { checkMessageExists, saveProcessedData } from './db.js';
import logger from '../utils/logger.js';

export const processMessage = async (message) => {
    const { message_id, timestamp, data } = message;

    logger.info({ message_id }, 'Processing message');

    // Idempotency
    const exists = await checkMessageExists(message_id);
    if (exists) {
        logger.warn({ message_id }, 'Message already processed. Skipping.');
        return;
    }

    // Transformation
    const transformedData = { ...data };
    if (transformedData.user_id) {
        transformedData.user_id = transformedData.user_id.toUpperCase();
    }

    const processedAt = new Date().toISOString();
    transformedData._metadata = {
        processed_by: 'node-consumer',
        processed_at: processedAt
    };

    // Save
    await saveProcessedData(
        message_id,
        timestamp,
        data.event_type || 'unknown',
        transformedData,
        processedAt
    );

    logger.info({ message_id }, 'Message processed successfully');
};
