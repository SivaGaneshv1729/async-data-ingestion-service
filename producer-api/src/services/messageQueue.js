import amqp from 'amqplib';
import env from '../config.js';
import logger from '../utils/logger.js';

const QUEUE_NAME = 'ingest_queue';
const DLQ_NAME = 'ingest_dlq';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
    if (connection) return channel;

    const url = `amqp://${env.MESSAGE_QUEUE_USER}:${env.MESSAGE_QUEUE_PASS}@${env.MESSAGE_QUEUE_HOST}:${env.MESSAGE_QUEUE_PORT}`;
    try {
        connection = await amqp.connect(url);
        channel = await connection.createChannel();

        // Assert Queues and DLQ
        await channel.assertQueue(DLQ_NAME, { durable: true });

        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': DLQ_NAME
            }
        });

        logger.info('Connected to RabbitMQ');
        return channel;
    } catch (err) {
        logger.error({ err }, 'Failed to connect to RabbitMQ');
        throw err;
    }
};

export const publishMessage = async (message) => {
    if (!channel) await connectRabbitMQ();

    try {
        const buffer = Buffer.from(JSON.stringify(message));
        channel.sendToQueue(QUEUE_NAME, buffer, { persistent: true });
        logger.info({ message_id: message.message_id }, 'Published message');
        return true;
    } catch (err) {
        logger.error({ err, message_id: message.message_id }, 'Error publishing message');
        throw err;
    }
};

export const getDeadLetters = async (limit = 10) => {
    if (!channel) await connectRabbitMQ();

    const messages = [];
    for (let i = 0; i < limit; i++) {
        const msg = await channel.get(DLQ_NAME, { noAck: false });
        if (!msg) break;

        messages.push({
            message_id: msg.properties.messageId,
            content: JSON.parse(msg.content.toString()),
            fields: msg.fields
        });

        channel.nack(msg, false, true);
    }
    return messages;
};

export const closeRabbitMQ = async () => {
    try {
        if (connection) {
            await connection.close();
            logger.info('RabbitMQ connection closed');
        }
    } catch (err) {
        logger.error({ err }, 'Error closing RabbitMQ connection');
    }
};
