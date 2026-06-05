require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { randomUUID } = require('node:crypto');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./shared/logger');
const db = require('./infrastructure/database');
const { redis } = require('./infrastructure/redis');
const { rankingsQueue, notificationsQueue, paymentsQueue, aiQueue } = require('./infrastructure/queue');
const errorHandler = require('./middleware/errorHandler.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');

// ─── Repositories ─────────────────────────────────────────────────────
const AuthRepository = require('./modules/auth/auth.repository');
const AcademyRepository = require('./modules/academy/academy.repository');
const PlayersRepository = require('./modules/players/players.repository');
const CoachesRepository = require('./modules/coaches/coaches.repository');
const AttendanceRepository = require('./modules/attendance/attendance.repository');
const RankingsRepository = require('./modules/rankings/rankings.repository');
const PaymentsRepository = require('./modules/payments/payments.repository');
const NotificationsRepository = require('./modules/notifications/notifications.repository');
const AiRepository = require('./modules/ai/ai.repository');
const AdminRepository = require('./modules/admin/admin.repository');
const CalendarRepository = require('./modules/calendar/calendar.repository');
const CustomDataRepository = require('./modules/custom-data/custom-data.repository');
const ChatRepository = require('./modules/chat/chat.repository');

// ─── Services ─────────────────────────────────────────────────────────
const AuthService = require('./modules/auth/auth.service');
const TotpService = require('./modules/auth/totp.service');
const AcademyService = require('./modules/academy/academy.service');
const PlayersService = require('./modules/players/players.service');
const CoachesService = require('./modules/coaches/coaches.service');
const AttendanceService = require('./modules/attendance/attendance.service');
const RankingsService = require('./modules/rankings/rankings.service');
const PaymentsService = require('./modules/payments/payments.service');
const NotificationsService = require('./modules/notifications/notifications.service');
const AiService = require('./modules/ai/ai.service');
const AdminService = require('./modules/admin/admin.service');
const CalendarService = require('./modules/calendar/calendar.service');
const CustomDataService = require('./modules/custom-data/custom-data.service');
const ChatService = require('./modules/chat/chat.service');

// ─── Controllers ──────────────────────────────────────────────────────
const AuthController = require('./modules/auth/auth.controller');
const AcademyController = require('./modules/academy/academy.controller');
const PlayersController = require('./modules/players/players.controller');
const CoachesController = require('./modules/coaches/coaches.controller');
const AttendanceController = require('./modules/attendance/attendance.controller');
const RankingsController = require('./modules/rankings/rankings.controller');
const PaymentsController = require('./modules/payments/payments.controller');
const NotificationsController = require('./modules/notifications/notifications.controller');
const AiController = require('./modules/ai/ai.controller');
const AdminController = require('./modules/admin/admin.controller');
const CalendarController = require('./modules/calendar/calendar.controller');
const CustomDataController = require('./modules/custom-data/custom-data.controller');
const ChatController = require('./modules/chat/chat.controller');

// ─── Routes ───────────────────────────────────────────────────────────
const authRoutes = require('./modules/auth/auth.routes');
const academyRoutes = require('./modules/academy/academy.routes');
const playersRoutes = require('./modules/players/players.routes');
const coachesRoutes = require('./modules/coaches/coaches.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const rankingsRoutes = require('./modules/rankings/rankings.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const customDataRoutes = require('./modules/custom-data/custom-data.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const {
    adminCalendarRoutes,
    coachCalendarRoutes,
    playerCalendarRoutes,
    parentCalendarRoutes,
} = require('./modules/calendar/calendar.routes');

// ─── DI: wire repositories ───────────────────────────────────────────
const authRepo = new AuthRepository(db);
const academyRepo = new AcademyRepository(db);
const playersRepo = new PlayersRepository(db);
const coachesRepo = new CoachesRepository(db);
const attendanceRepo = new AttendanceRepository(db, redis);
const rankingsRepo = new RankingsRepository(db);
const paymentsRepo = new PaymentsRepository(db);
const notificationsRepo = new NotificationsRepository(db);
const aiRepo = new AiRepository(db);
const adminRepo = new AdminRepository(db);
const calendarRepo = new CalendarRepository(db);
const customDataRepo = new CustomDataRepository(db);
const chatRepo = new ChatRepository(db);

// ─── DI: wire services ───────────────────────────────────────────────
const authService = new AuthService(authRepo, redis);
const totpService = new TotpService(authRepo);
const academyService = new AcademyService(academyRepo);
const playersService = new PlayersService(playersRepo);
const coachesService = new CoachesService(coachesRepo, academyService);
const attendanceService = new AttendanceService(attendanceRepo);
const rankingsService = new RankingsService(rankingsRepo, rankingsQueue);
const paymentsService = new PaymentsService(paymentsRepo, paymentsQueue);
const notificationsService = new NotificationsService(notificationsRepo, notificationsQueue);
const aiService = new AiService(aiRepo, aiQueue);
const adminService = new AdminService(adminRepo);
const customDataService = new CustomDataService(customDataRepo);
const calendarService = new CalendarService(calendarRepo, playersService, customDataService);
const chatService = new ChatService(chatRepo);

// ─── DI: wire controllers ────────────────────────────────────────────
const authController = new AuthController(authService, totpService);
const academyController = new AcademyController(academyService);
const playersController = new PlayersController(playersService);
const coachesController = new CoachesController(coachesService);
const attendanceController = new AttendanceController(attendanceService);
const rankingsController = new RankingsController(rankingsService);
const paymentsController = new PaymentsController(paymentsService);
const notificationsController = new NotificationsController(notificationsService);
const aiController = new AiController(aiService);
const adminController = new AdminController(adminService);
const calendarController = new CalendarController(calendarService);
const customDataController = new CustomDataController(customDataService);
const chatController = new ChatController(chatService);

// ═══════════════════════════════════════════════════════════════════════
//  Express App
// ═══════════════════════════════════════════════════════════════════════
const app = express();
app.locals.services = { chatService };

if (process.env.NODE_ENV !== 'test') {
    const matchDayInterval = setInterval(() => {
        calendarService
            .notifyDueMatchDays()
            .catch((err) => logger.error({ err }, 'Match day notification scan failed'));
    }, 60 * 1000);
    matchDayInterval.unref?.();

    const runWeeklyInjuryRisk = () => {
        calendarService
            .runWeeklyInjuryRiskAutomation()
            .then((summary) => {
                if (summary.skipped) {
                    logger.debug({ summary }, 'Weekly injury risk automation skipped');
                    return;
                }
                logger.info({ summary }, 'Weekly injury risk automation completed');
            })
            .catch((err) => logger.error({ err }, 'Weekly injury risk automation failed'));
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

// Trust first proxy so req.ip reflects the real client IP (needed for
// accurate rate-limiting and audit logging behind nginx / load balancers).
app.set('trust proxy', 1);

// ─── Global Middleware ────────────────────────────────────────────────
app.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false, // CSP handled by frontend / reverse proxy
}));
app.use(cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token', 'X-File-Name'],
}));
app.use(compression());
app.use(hpp());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next();
    if (env.CORS_ORIGINS.split(',').includes(origin)) return next();

    return res.status(403).json({
        success: false,
        error: { code: 'CSRF_ORIGIN_REJECTED', message: 'Request origin is not allowed' },
    });
});

// Attach a unique request ID to every request for tracing
app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
});

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

// Rate limiting
app.use('/api/', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/uploads/*', authMiddleware, async (req, res, next) => {
    try {
        const uploadsRoot = path.resolve(__dirname, '../uploads');
        const relativePath = req.params[0] || '';
        const requestedPath = path.resolve(uploadsRoot, relativePath);

        if (!requestedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
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
        return res.sendFile(requestedPath, (err) => {
            if (err) next(err);
        });
    } catch (err) {
        return next(err);
    }
});

// ─── API v1 Routes ────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes(authController));
app.use('/api/v1/academy', academyRoutes(academyController));
app.use('/api/v1/players', playersRoutes(playersController));
app.use('/api/v1/coaches', coachesRoutes(coachesController));
app.use('/api/v1/attendance', attendanceRoutes(attendanceController));
app.use('/api/v1/rankings', rankingsRoutes(rankingsController));
app.use('/api/v1/payments', paymentsRoutes(paymentsController));
app.use('/api/v1/notifications', notificationsRoutes(notificationsController));
app.use('/api/v1/ai', aiRoutes(aiController));
app.use('/api/v1/chat', chatRoutes(chatController));
app.use('/api/v1/admin', adminCalendarRoutes(calendarController));
app.use('/api/v1/admin', customDataRoutes(customDataController, 'admin'));
app.use('/api/v1/coach', coachCalendarRoutes(calendarController));
app.use('/api/v1/coach', customDataRoutes(customDataController, 'coach'));
app.use('/api/v1/player', playerCalendarRoutes(calendarController));
app.use('/api/v1/parent', parentCalendarRoutes(calendarController));
app.use('/api/v1/admin', adminRoutes(adminController));

// Role-based aliases matching the product API contract without the /v1 prefix.
app.use('/api/admin', adminCalendarRoutes(calendarController));
app.use('/api/admin', customDataRoutes(customDataController, 'admin'));
app.use('/api/coach', coachCalendarRoutes(calendarController));
app.use('/api/coach', customDataRoutes(customDataController, 'coach'));
app.use('/api/player', playerCalendarRoutes(calendarController));
app.use('/api/parent', parentCalendarRoutes(calendarController));

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
