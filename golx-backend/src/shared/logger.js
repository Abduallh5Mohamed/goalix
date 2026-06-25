const pino = require('pino');
const env = require('../config/env');

const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
        env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
            : undefined,
    base: { service: 'goalix-api' },
    serializers: pino.stdSerializers,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = logger;
