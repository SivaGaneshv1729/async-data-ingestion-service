import { cleanEnv, str, port, host } from 'envalid';

const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
    MESSAGE_QUEUE_HOST: host({ default: 'rabbitmq' }),
    MESSAGE_QUEUE_PORT: port({ default: 5672 }),
    MESSAGE_QUEUE_USER: str({ default: 'guest' }),
    MESSAGE_QUEUE_PASS: str({ default: 'guest' }),
    POSTGRES_HOST: host({ default: 'db' }),
    POSTGRES_PORT: port({ default: 5432 }),
    POSTGRES_DB: str({ default: 'processed_data' }),
    POSTGRES_USER: str({ default: 'user' }),
    POSTGRES_PASSWORD: str({ default: 'password' }),
});

export default env;
