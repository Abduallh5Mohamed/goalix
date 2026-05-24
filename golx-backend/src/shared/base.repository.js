const { NotFoundError } = require('./errors');

/**
 * BaseRepository — generic CRUD, knows nothing about any specific module.
 * Every module's repository extends this class.
 */
class BaseRepository {
    constructor(tableName, db) {
        this.table = tableName;
        this.db = db;
    }

    /** Returns a query builder scoped to non-deleted rows */
    baseQuery(trx) {
        const q = (trx || this.db)(this.table);
        // Only add soft-delete filter if the table has deleted_at column
        return q.whereNull(`${this.table}.deleted_at`);
    }

    async findById(id, trx) {
        return this.baseQuery(trx).where(`${this.table}.id`, id).first();
    }

    async findOne(filters, trx) {
        return this.baseQuery(trx).where(filters).first();
    }

    async findAll({ filters = {}, page = 1, limit = 20, orderBy = 'created_at', order = 'desc' } = {}, trx) {
        // Whitelist column name (only lowercase letters and underscores) to prevent injection
        const safeOrderBy = /^[a-z_]+$/.test(orderBy) ? orderBy : 'created_at';
        const safeOrder = order === 'asc' ? 'asc' : 'desc';

        const query = this.baseQuery(trx);

        // Apply filters — keys must be plain identifiers; values are parameterized by Knex
        for (const [key, value] of Object.entries(filters)) {
            if (/^[a-z_]+$/.test(key) && value !== undefined && value !== null) {
                query.where(`${this.table}.${key}`, value);
            }
        }

        const countResult = await query.clone().count('id as count').first();
        const total = parseInt(countResult.count, 10);

        const data = await query
            .orderBy(`${this.table}.${safeOrderBy}`, safeOrder)
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
    }

    async create(data, trx) {
        const [row] = await (trx || this.db)(this.table).insert(data).returning('*');
        return row;
    }

    async createMany(dataArray, trx) {
        return (trx || this.db)(this.table).insert(dataArray).returning('*');
    }

    async update(id, data, trx) {
        const [row] = await (trx || this.db)(this.table)
            .where({ id })
            .whereNull('deleted_at')
            .update({ ...data, updated_at: new Date() })
            .returning('*');
        return row;
    }

    async softDelete(id, trx) {
        const result = await (trx || this.db)(this.table)
            .where({ id })
            .whereNull('deleted_at')
            .update({ deleted_at: new Date() });
        if (result === 0) throw new NotFoundError(this.table, id);
        return result;
    }

    async hardDelete(id, trx) {
        return (trx || this.db)(this.table).where({ id }).del();
    }

    async count(filters = {}, trx) {
        const query = this.baseQuery(trx);
        for (const [key, value] of Object.entries(filters)) {
            // Whitelist column names to prevent SQL column injection (same as findAll)
            if (/^[a-z_]+$/.test(key) && value !== undefined && value !== null) {
                query.where(key, value);
            }
        }
        const result = await query.count('id as count').first();
        return parseInt(result.count, 10);
    }

    async exists(filters, trx) {
        const row = await this.baseQuery(trx).where(filters).select(this.db.raw('1')).first();
        return !!row;
    }
}

module.exports = BaseRepository;
