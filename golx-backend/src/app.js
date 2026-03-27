require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { randomUUID } = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./shared/logger');
const db = require('./infrastructure/database');
const { redis, connectRedis } = require('./infrastructure/redis');
const { rankingsQueue, notificationsQueue, paymentsQueue, aiQueue } = require('./infrastructure/queue');
const errorHandler = require('./middleware/errorHandler.middleware');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit.middleware');

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

// ─── Services ─────────────────────────────────────────────────────────
const AuthService = require('./modules/auth/auth.service');
const AcademyService = require('./modules/academy/academy.service');
const PlayersService = require('./modules/players/players.service');
const CoachesService = require('./modules/coaches/coaches.service');
const AttendanceService = require('./modules/attendance/attendance.service');
const RankingsService = require('./modules/rankings/rankings.service');
const PaymentsService = require('./modules/payments/payments.service');
const NotificationsService = require('./modules/notifications/notifications.service');
const AiService = require('./modules/ai/ai.service');

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

// ─── DI: wire services ───────────────────────────────────────────────
const authService = new AuthService(authRepo, redis);
const academyService = new AcademyService(academyRepo);
const playersService = new PlayersService(playersRepo);
const coachesService = new CoachesService(coachesRepo);
const attendanceService = new AttendanceService(attendanceRepo);
const rankingsService = new RankingsService(rankingsRepo, rankingsQueue);
const paymentsService = new PaymentsService(paymentsRepo, paymentsQueue);
const notificationsService = new NotificationsService(notificationsRepo, notificationsQueue);
const aiService = new AiService(aiRepo, aiQueue);

// ─── DI: wire controllers ────────────────────────────────────────────
const authController = new AuthController(authService);
const academyController = new AcademyController(academyService);
const playersController = new PlayersController(playersService);
const coachesController = new CoachesController(coachesService);
const attendanceController = new AttendanceController(attendanceService);
const rankingsController = new RankingsController(rankingsService);
const paymentsController = new PaymentsController(paymentsService);
const notificationsController = new NotificationsController(notificationsService);
const aiController = new AiController(aiService);

// ═══════════════════════════════════════════════════════════════════════
//  Express App
// ═══════════════════════════════════════════════════════════════════════
const app = express();

// Trust first proxy so req.ip reflects the real client IP (needed for
// accurate rate-limiting and audit logging behind nginx / load balancers).
app.set('trust proxy', 1);

// ─── Global Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(compression());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Attach a unique request ID to every request for tracing
app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
});

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
