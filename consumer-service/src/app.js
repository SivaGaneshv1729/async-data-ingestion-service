import amqp from 'amqplib';
import dotenv from 'dotenv';
import { initDb } from './services/db.js';
import { processMessage } from './services/processor.js';
import { withRetry } from './utils/retry.js';

dotenv.config();

const RABBITMQ_HOST = process.env.MESSAGE_QUEUE_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.MESSAGE_QUEUE_PORT || 5672;
const RABBITMQ_USER = process.env.MESSAGE_QUEUE_USER || 'guest';
const RABBITMQ_PASS = process.env.MESSAGE_QUEUE_PASS || 'guest';
const QUEUE_NAME = 'ingest_queue';
const DLQ_NAME = 'ingest_dlq';

const startConsumer = async () => {
    await initDb();

    // Connect to RabbitMQ
    const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
    let connection;
    try {
        connection = await amqp.connect(url);
    } catch (err) {
        console.error("RabbitMQ connection failed, retrying in 5s...", err);
        setTimeout(startConsumer, 5000);
        return;
    }

    const channel = await connection.createChannel();

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

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", QUEUE_NAME);

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
                console.error("Message processing failed permanently:", err.message);
                // Nack with requeue=false to send to DLQ
                channel.nack(msg, false, false);
            }
        }
    });
};

startConsumer().catch(console.error);
