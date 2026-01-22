import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import ingestRouter from './routes/ingest.js';
import { connectRabbitMQ, closeRabbitMQ } from './services/messageQueue.js';
import env from './config.js';
import logger from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swaggerDocument = yaml.load(path.join(__dirname, '../swagger.yaml'));

const app = express();

app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, 'Incoming Request');
    next();
});

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', ingestRouter);

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

let server;

const startServer = async () => {
    try {
        await connectRabbitMQ();
        server = app.listen(env.PORT, () => {
            logger.info(`Producer API listening on port ${env.PORT}`);
            logger.info(`Swagger Docs available at http://localhost:${env.PORT}/api-docs`);
        });
    } catch (err) {
        logger.error({ err }, 'Failed to start server');
        setTimeout(startServer, 5000);
    }
};

// Graceful Shutdown
const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    if (server) {
        server.close(() => {
            logger.info('HTTP server closed.');
        });
    }
    await closeRabbitMQ();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
