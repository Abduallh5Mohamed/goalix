const { randomUUID } = require('node:crypto');

const env = require('../config/env');
const logger = require('../shared/logger');
const { redis, isRedisAvailable } = require('../infrastructure/redis');

async function runWithClusterLock({
    key,
    ttlMs,
    task,
    redisClient = redis,
    log = logger,
}) {
    if (!redisClient || !isRedisAvailable()) {
        if (env.NODE_ENV === 'production') {
            log.warn({ lock: key }, 'Skipping automation because Redis lock is unavailable in production');
            return null;
        }
        return task();
    }

    const token = randomUUID();
    const acquired = await redisClient.set(key, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') return null;

    try {
        return await task();
    } finally {
        try {
            await redisClient.eval(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                1,
                key,
                token,
            );
        } catch (err) {
            log.warn({ err, lock: key }, 'Failed to release automation lock');
        }
    }
}

function scheduleInterval(timers, callback, intervalMs, initialDelayMs = intervalMs) {
    const initial = setTimeout(() => {
        void callback();
        const interval = setInterval(() => void callback(), intervalMs);
        interval.unref?.();
        timers.push(interval);
    }, initialDelayMs);
    initial.unref?.();
    timers.push(initial);
}

function startBackgroundAutomations({
    services,
    redisClient = redis,
    log = logger,
} = {}) {
    if (env.NODE_ENV === 'test') {
        return { stop: () => {} };
    }

    const timers = [];
    const { calendarService, notificationsService } = services || {};
    const backgroundAutomationsEnabled = env.BACKGROUND_AUTOMATIONS_ENABLED ?? false;
    const injuryRiskAutomationEnabled = env.INJURY_RISK_AUTOMATION_ENABLED ?? false;
    const notificationCleanupEnabled = env.NOTIFICATION_CLEANUP_ENABLED ?? true;

    if (backgroundAutomationsEnabled && calendarService) {
        let reminderScanRunning = false;
        const runReminderScans = async () => {
            if (reminderScanRunning) {
                log.debug('Reminder scan skipped because the previous run is still active');
                return;
            }

            reminderScanRunning = true;
            try {
                await runWithClusterLock({
                    key: 'goalix:automation:reminder-scans',
                    ttlMs: 55 * 1000,
                    redisClient,
                    log,
                    task: async () => {
                        const scans = [
                            ['Match day', calendarService.notifyDueMatchDays()],
                            ['Attendance QR', calendarService.notifyDueAttendanceQrReminders()],
                            ['Monthly measurement', calendarService.notifyDueMonthlyMeasurementReminders()],
                        ];
                        const results = await Promise.allSettled(scans.map(([, task]) => task));
                        results.forEach((result, index) => {
                            if (result.status === 'rejected') {
                                log.error(
                                    { err: result.reason },
                                    `${scans[index][0]} notification scan failed`,
                                );
                            }
                        });
                    },
                });
            } finally {
                reminderScanRunning = false;
            }
        };

        scheduleInterval(timers, runReminderScans, 60 * 1000, 60 * 1000);
    }

    if (injuryRiskAutomationEnabled && calendarService) {
        let injuryRiskRunActive = false;
        const runWeeklyInjuryRisk = async () => {
            if (injuryRiskRunActive) {
                log.debug('Weekly injury risk automation skipped because the previous run is still active');
                return;
            }

            injuryRiskRunActive = true;
            try {
                await runWithClusterLock({
                    key: 'goalix:automation:weekly-injury-risk',
                    ttlMs: 30 * 60 * 1000,
                    redisClient,
                    log,
                    task: async () => {
                        const summary = await calendarService.runWeeklyInjuryRiskAutomation();
                        if (summary.skipped) {
                            log.debug({ summary }, 'Weekly injury risk automation skipped');
                            return;
                        }
                        log.info({ summary }, 'Weekly injury risk automation completed');
                    },
                });
            } catch (err) {
                log.error({ err }, 'Weekly injury risk automation failed');
            } finally {
                injuryRiskRunActive = false;
            }
        };

        scheduleInterval(
            timers,
            runWeeklyInjuryRisk,
            Number(process.env.INJURY_RISK_WEEKLY_SCAN_INTERVAL_MS || 60 * 60 * 1000),
            Number(process.env.INJURY_RISK_WEEKLY_INITIAL_DELAY_MS || 30 * 1000),
        );
    }

    if (notificationCleanupEnabled && notificationsService) {
        let notificationCleanupRunning = false;
        const runNotificationCleanup = async () => {
            if (notificationCleanupRunning) {
                log.debug('Notification retention cleanup skipped because the previous run is still active');
                return;
            }

            notificationCleanupRunning = true;
            try {
                await runWithClusterLock({
                    key: 'goalix:automation:notification-cleanup',
                    ttlMs: Math.min(
                        env.NOTIFICATION_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000,
                        60 * 60 * 1000,
                    ),
                    redisClient,
                    log,
                    task: async () => {
                        const result = await notificationsService.cleanupExpiredNotifications();
                        if (result.deletedNotifications || result.deletedLogs) {
                            log.info({ result }, 'Expired notifications cleaned up');
                        } else {
                            log.debug({ result }, 'Expired notification cleanup completed with no deletions');
                        }
                    },
                });
            } catch (err) {
                log.error({ err }, 'Expired notification cleanup failed');
            } finally {
                notificationCleanupRunning = false;
            }
        };

        scheduleInterval(
            timers,
            runNotificationCleanup,
            env.NOTIFICATION_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000,
            Number(process.env.NOTIFICATION_CLEANUP_INITIAL_DELAY_MS || 10 * 1000),
        );
    }

    return {
        stop: () => {
            while (timers.length) clearTimeout(timers.pop());
        },
    };
}

module.exports = {
    runWithClusterLock,
    startBackgroundAutomations,
};
