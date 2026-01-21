import { checkMessageExists, saveProcessedData } from './db.js';

export const processMessage = async (message) => {
    const { message_id, timestamp, data } = message;

    console.log(`Processing message: ${message_id}`);

    // Idempotency
    const exists = await checkMessageExists(message_id);
    if (exists) {
        console.warn(`Message ${message_id} already processed. Skipping.`);
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

    console.log(`Message ${message_id} processed successfully.`);
};
