import pino from 'pino';
import env from '../config.js';

const logger = pino({
    level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    } : undefined
});

export default logger;
