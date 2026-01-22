import { cleanEnv, str, port, host } from 'envalid';

const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'test', 'production', 'provisioning'], default: 'development' }),
    PORT: port({ default: 8000 }),
    MESSAGE_QUEUE_HOST: host({ default: 'rabbitmq' }),
    MESSAGE_QUEUE_PORT: port({ default: 5672 }),
    MESSAGE_QUEUE_USER: str({ default: 'guest' }),
    MESSAGE_QUEUE_PASS: str({ default: 'guest' }),
});

export default env;
