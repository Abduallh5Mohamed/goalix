const { NotFoundError } = require('./errors');

/**
 * BaseService — common service patterns.
 * Every module's service extends this class.
 */
class BaseService {
    constructor(repository) {
        this.repository = repository;
    }

    async getById(id) {
        const record = await this.repository.findById(id);
        if (!record) throw new NotFoundError(this.repository.table, id);
        return record;
    }

    async getAll(options) {
        return this.repository.findAll(options);
    }

    async create(data) {
        return this.repository.create(data);
    }

    async update(id, data) {
        const record = await this.repository.update(id, data);
        if (!record) throw new NotFoundError(this.repository.table, id);
        return record;
    }

    async delete(id) {
        return this.repository.softDelete(id);
    }
}

module.exports = BaseService;
