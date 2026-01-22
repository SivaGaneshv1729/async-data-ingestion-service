import amqp from 'amqplib';
import { initDb, closeDb } from './services/db.js';
import { processMessage } from './services/processor.js';
import { withRetry } from './utils/retry.js';
import env from './config.js';
import logger from './utils/logger.js';

const QUEUE_NAME = 'ingest_queue';
const DLQ_NAME = 'ingest_dlq';

let connection;
let channel;

const startConsumer = async () => {
    await initDb();

    // Connect to RabbitMQ
    const url = `amqp://${env.MESSAGE_QUEUE_USER}:${env.MESSAGE_QUEUE_PASS}@${env.MESSAGE_QUEUE_HOST}:${env.MESSAGE_QUEUE_PORT}`;
    try {
        connection = await amqp.connect(url);
    } catch (err) {
        logger.error({ err }, "RabbitMQ connection failed, retrying in 5s...");
        setTimeout(startConsumer, 5000);
        return;
    }

    channel = await connection.createChannel();

    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': DLQ_NAME
        }
    });

    // Prefetch 1 message
    channel.prefetch(1);

    logger.info(` [*] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const content = JSON.parse(msg.content.toString());

            try {
                // Retry logic wrapper
                await withRetry(async () => {
                    await processMessage(content);
                }, 3, 1000);

                channel.ack(msg);
            } catch (err) {
                logger.error({ err: err.message }, "Message processing failed permanently");
                // Nack with requeue=false to send to DLQ
                channel.nack(msg, false, false);
            }
        }
    });
};

// Graceful Shutdown
const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        logger.info('RabbitMQ connection closed.');

        await closeDb();
        logger.info('Database pool closed.');

        process.exit(0);
    } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startConsumer().catch(err => {
    logger.error({ err }, 'Fatal error starting consumer');
});
