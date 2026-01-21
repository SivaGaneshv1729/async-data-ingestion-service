import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_HOST = process.env.MESSAGE_QUEUE_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.MESSAGE_QUEUE_PORT || 5672;
const RABBITMQ_USER = process.env.MESSAGE_QUEUE_USER || 'guest';
const RABBITMQ_PASS = process.env.MESSAGE_QUEUE_PASS || 'guest';
const QUEUE_NAME = 'ingest_queue';
const DLQ_NAME = 'ingest_dlq';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
    if (connection) return channel;

    const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
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

        console.log('Connected to RabbitMQ');
        return channel;
    } catch (err) {
        console.error('Failed to connect to RabbitMQ:', err);
        throw err;
    }
};

export const publishMessage = async (message) => {
    if (!channel) await connectRabbitMQ();

    try {
        const buffer = Buffer.from(JSON.stringify(message));
        channel.sendToQueue(QUEUE_NAME, buffer, { persistent: true });
        console.log(`Published message: ${message.message_id}`);
        return true;
    } catch (err) {
        console.error('Error publishing message:', err);
        throw err;
    }
};

export const getDeadLetters = async (limit = 10) => {
    if (!channel) await connectRabbitMQ();

    // amqplib doesn't have a simple "browse" without consuming.
    // We will use 'get' repeatedly.
    const messages = [];
    for (let i = 0; i < limit; i++) {
        const msg = await channel.get(DLQ_NAME, { noAck: false });
        if (!msg) break;

        messages.push({
            message_id: msg.properties.messageId, // if set
            content: JSON.parse(msg.content.toString()),
            fields: msg.fields
        });

        // Requeue immediately to behave like a peek
        channel.nack(msg, false, true);
    }
    return messages;
};

export const closeConnection = async () => {
    if (connection) await connection.close();
};
