require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { randomUUID } = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { corsOrigin, isAllowedOrigin } = require('./config/cors');
const logger = require('./shared/logger');
const db = require('./infrastructure/database');
const { isRedisAvailable } = require('./infrastructure/redis');
const errorHandler = require('./middleware/errorHandler.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { requireCsrfToken, setCsrfCookie } = require('./middleware/csrf.middleware');
const storage = require('./shared/storage');
const { createApplicationServices } = require('./bootstrap/service-factory');
const { mountApplicationRoutes } = require('./bootstrap/route-registry');

const { controllers, services } = createApplicationServices();
const { calendarService, chatService, notificationsService } = services;

const app = express();
app.locals.services = { chatService };

const backgroundAutomationsEnabled =
    env.BACKGROUND_AUTOMATIONS_ENABLED ?? false;
const injuryRiskAutomationEnabled =
    env.INJURY_RISK_AUTOMATION_ENABLED ?? false;

if (env.NODE_ENV !== 'test' && backgroundAutomationsEnabled) {
    let reminderScanRunning = false;
    const runReminderScans = async () => {
        if (reminderScanRunning) {
            logger.debug('Reminder scan skipped because the previous run is still active');
            return;
        }

        reminderScanRunning = true;
        try {
            const scans = [
                ['Match day', calendarService.notifyDueMatchDays()],
                ['Attendance QR', calendarService.notifyDueAttendanceQrReminders()],
                ['Monthly measurement', calendarService.notifyDueMonthlyMeasurementReminders()],
            ];
            const results = await Promise.allSettled(scans.map(([, task]) => task));
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    logger.error(
                        { err: result.reason },
                        `${scans[index][0]} notification scan failed`,
                    );
                }
            });
        } finally {
            reminderScanRunning = false;
        }
    };

    const matchDayInterval = setInterval(runReminderScans, 60 * 1000);
    matchDayInterval.unref?.();
}

if (env.NODE_ENV !== 'test' && injuryRiskAutomationEnabled) {
    let injuryRiskRunActive = false;
    const runWeeklyInjuryRisk = () => {
        if (injuryRiskRunActive) {
            logger.debug('Weekly injury risk automation skipped because the previous run is still active');
            return;
        }

        injuryRiskRunActive = true;
        calendarService
            .runWeeklyInjuryRiskAutomation()
            .then((summary) => {
                if (summary.skipped) {
                    logger.debug({ summary }, 'Weekly injury risk automation skipped');
                    return;
                }
                logger.info({ summary }, 'Weekly injury risk automation completed');
            })
            .catch((err) => logger.error({ err }, 'Weekly injury risk automation failed'))
            .finally(() => {
                injuryRiskRunActive = false;
            });
    };
    const injuryRiskInitialDelay = Number(
        process.env.INJURY_RISK_WEEKLY_INITIAL_DELAY_MS || 30 * 1000,
    );
    const injuryRiskInterval = Number(
        process.env.INJURY_RISK_WEEKLY_SCAN_INTERVAL_MS || 60 * 60 * 1000,
    );
    const injuryRiskTimeout = setTimeout(runWeeklyInjuryRisk, injuryRiskInitialDelay);
    const injuryRiskWeeklyInterval = setInterval(runWeeklyInjuryRisk, injuryRiskInterval);
    injuryRiskTimeout.unref?.();
    injuryRiskWeeklyInterval.unref?.();
}

if (env.NODE_ENV !== 'test') {
    let notificationCleanupRunning = false;
    const runNotificationCleanup = async () => {
        if (notificationCleanupRunning) {
            logger.debug('Notification retention cleanup skipped because the previous run is still active');
            return;
        }

        notificationCleanupRunning = true;
        try {
            const result = await notificationsService.cleanupExpiredNotifications();
            if (result.deletedNotifications || result.deletedLogs) {
                logger.info({ result }, 'Expired notifications cleaned up');
            } else {
                logger.debug({ result }, 'Expired notification cleanup completed with no deletions');
            }
        } catch (err) {
            logger.error({ err }, 'Expired notification cleanup failed');
        } finally {
            notificationCleanupRunning = false;
        }
    };

    const notificationCleanupInitialDelay = Number(
        process.env.NOTIFICATION_CLEANUP_INITIAL_DELAY_MS || 10 * 1000,
    );
    const notificationCleanupInterval = env.NOTIFICATION_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    const notificationCleanupTimeout = setTimeout(
        runNotificationCleanup,
        notificationCleanupInitialDelay,
    );
    const notificationCleanupTimer = setInterval(
        runNotificationCleanup,
        notificationCleanupInterval,
    );
    notificationCleanupTimeout.unref?.();
    notificationCleanupTimer.unref?.();
}

app.set('trust proxy', 1);

app.use((req, res, next) => {
    req.id = req.get('x-request-id') || randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
});

app.use((req, res, next) => {
    if (env.SLOW_REQUEST_LOG_MS <= 0) return next();
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        if (durationMs < env.SLOW_REQUEST_LOG_MS) return;

        logger.warn(
            {
                requestId: req.id,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: Number(durationMs.toFixed(2)),
            },
            'Slow HTTP request',
        );
    });

    return next();
});

app.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token', 'X-File-Name'],
}));
app.use(compression());
app.use(hpp());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(setCsrfCookie);
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next();
    if (isAllowedOrigin(origin)) return next();

    return res.status(403).json({
        success: false,
        error: { code: 'CSRF_ORIGIN_REJECTED', message: 'Request origin is not allowed' },
    });
});
app.use(requireCsrfToken);

const sensitiveAuditTargets = [
    { prefix: '/api/v1/admin', entityType: 'admin_api' },
    { prefix: '/api/admin', entityType: 'admin_api' },
    { prefix: '/api/v1/auth/register', entityType: 'auth_users' },
    { prefix: '/api/v1/auth/2fa', entityType: 'auth_2fa' },
    { prefix: '/api/v1/players', entityType: 'player' },
    { prefix: '/api/v1/coaches', entityType: 'coach' },
    { prefix: '/api/v1/payments', entityType: 'payment' },
    { prefix: '/api/v1/academy', entityType: 'academy_settings' },
    { prefix: '/api/v1/chat', entityType: 'chat' },
];

app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

    const auditTarget = sensitiveAuditTargets.find((target) => req.originalUrl.startsWith(target.prefix));
    if (!auditTarget) return next();

    res.on('finish', () => {
        if (!req.user?.userId) return;
        const routePath = req.route?.path || req.path;
        const normalizedPath = String(routePath).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        db('audit_logs').insert({
            user_id: req.user.userId,
            action: `${auditTarget.entityType}_${req.method.toLowerCase()}_${normalizedPath || 'mutation'}`,
            table_name: auditTarget.entityType,
            record_id: req.user.userId,
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            session_jti: req.user.sessionId || null,
            metadata: JSON.stringify({
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                requestId: req.id,
            }),
        }).catch((err) => logger.warn({ err, requestId: req.id }, 'Failed to write sensitive audit log'));
    });

    return next();
});

app.use('/api/', apiLimiter);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
    const checks = {
        postgres: { ok: false },
        redis: { ok: isRedisAvailable(), optional: true },
    };

    try {
        await db.raw('SELECT 1');
        checks.postgres.ok = true;
    } catch (err) {
        checks.postgres.error = err.message;
    }

    const ok = checks.postgres.ok;
    res.status(ok ? 200 : 503).json({
        status: ok && checks.redis.ok ? 'ready' : ok ? 'degraded' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks,
    });
});

app.get('/uploads/*', authMiddleware, async (req, res, next) => {
    try {
        const relativePath = req.params[0] || '';
        const upload = await storage.getUpload(relativePath);
        if (!upload) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_FILE_PATH', message: 'Invalid file path' },
            });
        }

        if (relativePath.replace(/\\/g, '/').startsWith('chat/')) {
            const attachmentUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
            const allowed = await chatService.canUserAccessAttachment(req.user, attachmentUrl);
            if (!allowed) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'File not found' },
                });
            }
        }

        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, max-age=604800');
        if (upload.type === 'stream') {
            if (upload.contentType) res.setHeader('Content-Type', upload.contentType);
            if (upload.contentLength) res.setHeader('Content-Length', String(upload.contentLength));
            upload.body.on('error', next);
            return upload.body.pipe(res);
        }
        return res.sendFile(upload.path, (err) => {
            if (err) next(err);
        });
    } catch (err) {
        return next(err);
    }
});

mountApplicationRoutes(app, controllers);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
    });
});

app.use(errorHandler);

module.exports = app;
