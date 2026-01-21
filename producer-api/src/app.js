import express from 'express';
import ingestRouter from './routes/ingest.js';
import { connectRabbitMQ } from './services/messageQueue.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// Routes
app.use('/api', ingestRouter);

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

const startServer = async () => {
    try {
        await connectRabbitMQ();
        app.listen(PORT, () => {
            console.log(`Producer API listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
