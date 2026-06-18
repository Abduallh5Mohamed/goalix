/**
 * Seed one operational admin without touching demo data.
 *
 * Run:
 *   npx knex seed:run --specific=03_bootstrap_admin.js
 */
const bcrypt = require('bcrypt');
const { ensureIamForAuthUser } = require('../src/shared/iam-sync');

const ADMIN_EMAIL = 'admin@golix.com';
const ADMIN_PASSWORD = 'Admin@123456';

exports.seed = async function seed(knex) {
    await knex.transaction(async (trx) => {
        const academy = await trx('academy_academies')
            .whereNull('deleted_at')
            .orderBy('created_at', 'asc')
            .first('id', 'owner_user_id');

        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const existing = await trx('auth_users')
            .whereRaw('lower(email) = lower(?)', [ADMIN_EMAIL])
            .first();

        let adminUser;
        if (existing) {
            const [updated] = await trx('auth_users')
                .where({ id: existing.id })
                .update({
                    email: ADMIN_EMAIL,
                    password_hash: passwordHash,
                    role: 'admin',
                    academy_id: academy?.id || existing.academy_id || null,
                    is_active: true,
                    is_verified: true,
                    failed_login_attempts: 0,
                    locked_until: null,
                    last_failed_login_at: null,
                    deleted_at: null,
                    updated_at: trx.fn.now(),
                })
                .returning('*');
            adminUser = updated;
        } else {
            const [inserted] = await trx('auth_users')
                .insert({
                    email: ADMIN_EMAIL,
                    password_hash: passwordHash,
                    role: 'admin',
                    academy_id: academy?.id || null,
                    is_active: true,
                    is_verified: true,
                })
                .returning('*');
            adminUser = inserted;
        }

        await ensureIamForAuthUser(trx, adminUser, {
            fullName: 'Goalix Admin',
            jobTitle: 'Administrator',
            department: 'Operations',
        });

        if (academy?.id && !academy.owner_user_id) {
            await trx('academy_academies')
                .where({ id: academy.id })
                .update({ owner_user_id: adminUser.id, updated_at: trx.fn.now() });
        }

        await trx('audit_logs').insert({
            user_id: adminUser.id,
            action: 'bootstrap_admin_ensured',
            table_name: 'auth_users',
            record_id: adminUser.id,
            new_data: JSON.stringify({ email: ADMIN_EMAIL, role: 'admin', academyId: adminUser.academy_id || null }),
            metadata: JSON.stringify({ source: '03_bootstrap_admin.js' }),
        });

        console.log(`[seed] Admin ready: ${ADMIN_EMAIL}`);
    });
};
