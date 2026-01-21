import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ingestSchema } from '../middleware/validation.js';
import { publishMessage, getDeadLetters } from '../services/messageQueue.js';

const router = express.Router();

router.post('/data/ingest', async (req, res) => {
    const { error, value } = ingestSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const message = {
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
        data: value
    };

    try {
        await publishMessage(message);
        res.status(202).json({
            status: 'accepted',
            message_id: message.message_id
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to publish message' });
    }
});

router.get('/dead-letters', async (req, res) => {
    try {
        const messages = await getDeadLetters(req.query.limit || 10);
        res.json({ count: messages.length, messages });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve dead letters' });
    }
});

export default router;
