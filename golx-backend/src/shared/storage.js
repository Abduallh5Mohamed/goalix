const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const env = require('../config/env');
const db = require('../infrastructure/database');
const logger = require('./logger');
const { AppError } = require('./errors');

const uploadsRoot = path.resolve(__dirname, '../../uploads');

function sanitizeSegment(value) {
    return String(value || 'shared').replace(/[^a-zA-Z0-9-]/g, '') || 'shared';
}

function uploadKey(scope, academyId, storedName) {
    return `${scope}/${sanitizeSegment(academyId)}/${storedName}`;
}

function publicUploadUrl(key) {
    return `/uploads/${key}`;
}

function storageKeyFromUrl(url) {
    return String(url || '').replace(/\\/g, '/').replace(/^\/uploads\/+/, '').replace(/^\/+/, '');
}

function isSafeStorageKey(value) {
    const key = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return Boolean(key)
        && !key.includes('\0')
        && !key.split('/').some((segment) => segment === '.' || segment === '..');
}

async function s3Client() {
    const { S3Client } = require('@aws-sdk/client-s3');
    return new S3Client({
        region: env.S3_REGION || 'auto',
        endpoint: env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
            : undefined,
    });
}

async function deleteS3Object(key) {
    try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const client = await s3Client();
        await client.send(new DeleteObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
        }));
    } catch (err) {
        logger.warn({ err, key }, 'Failed to clean up S3 upload after metadata failure');
    }
}

async function assertSensitiveUploadMetadata({ media, key, localPath, isSensitive }) {
    if (media || isSensitive === false) return;

    if (env.STORAGE_PROVIDER === 's3') {
        await deleteS3Object(key);
    } else if (localPath) {
        await fs.unlink(localPath).catch((err) => {
            logger.warn({ err, key, localPath }, 'Failed to clean up local upload after metadata failure');
        });
    }

    throw new AppError(
        'Upload metadata could not be recorded. Please try again.',
        503,
        'UPLOAD_METADATA_UNAVAILABLE',
    );
}

async function recordMediaFile({
    academyId,
    scope,
    uploaderId,
    entityType,
    entityId,
    url,
    key,
    sizeBytes,
    contentType,
    isSensitive,
}) {
    try {
        const [row] = await db('media_files')
            .insert({
                academy_id: academyId || null,
                scope: scope || null,
                uploader_id: uploaderId || null,
                entity_type: entityType || scope || null,
                entity_id: entityId || null,
                url,
                storage_key: key,
                size_bytes: sizeBytes || null,
                mime_type: contentType || null,
                is_sensitive: isSensitive !== false,
            })
            .onConflict('storage_key')
            .merge({
                academy_id: academyId || null,
                scope: scope || null,
                uploader_id: uploaderId || null,
                entity_type: entityType || scope || null,
                entity_id: entityId || null,
                url,
                size_bytes: sizeBytes || null,
                mime_type: contentType || null,
                is_sensitive: isSensitive !== false,
                updated_at: new Date(),
            })
            .returning('*');
        return row;
    } catch (err) {
        logger.warn({ err, scope, academyId, key }, 'Failed to record upload metadata');
        return null;
    }
}

async function putUpload({
    scope,
    academyId,
    extension,
    buffer,
    contentType,
    uploaderId,
    entityType,
    entityId,
    isSensitive = true,
}) {
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const key = uploadKey(scope, academyId, storedName);
    const url = publicUploadUrl(key);

    if (env.STORAGE_PROVIDER === 's3') {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        const client = await s3Client();
        await client.send(new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType || 'application/octet-stream',
            ServerSideEncryption: 'AES256',
        }));
        const media = await recordMediaFile({
            academyId,
            scope,
            uploaderId,
            entityType,
            entityId,
            url,
            key,
            sizeBytes: buffer?.length,
            contentType,
            isSensitive,
        });
        await assertSensitiveUploadMetadata({ media, key, isSensitive });
        return { key, url, media };
    }

    const localPath = path.join(uploadsRoot, key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, buffer);
    const media = await recordMediaFile({
        academyId,
        scope,
        uploaderId,
        entityType,
        entityId,
        url,
        key,
        sizeBytes: buffer?.length,
        contentType,
        isSensitive,
    });
    await assertSensitiveUploadMetadata({ media, key, localPath, isSensitive });
    return { key, path: localPath, url, media };
}

async function findUploadMetadata(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return db('media_files')
        .where({ storage_key: normalized })
        .first();
}

async function attachMediaToEntity(fileUrls = [], {
    academyId,
    scope,
    uploaderId,
    entityType,
    entityId,
    isSensitive,
} = {}) {
    const urls = [...new Set((fileUrls || []).filter(Boolean))];
    const keys = [...new Set(urls.map(storageKeyFromUrl).filter(Boolean))];
    if (!urls.length && !keys.length) return 0;
    if (!academyId || !scope || !uploaderId || !entityType || !entityId) {
        throw new AppError(
            'Upload ownership information is incomplete.',
            400,
            'INVALID_UPLOAD_OWNERSHIP',
        );
    }

    try {
        return await db.transaction(async (trx) => {
            const media = await trx('media_files')
                .where({
                    academy_id: academyId,
                    scope,
                    uploader_id: uploaderId,
                })
                .whereIn('storage_key', keys)
                .where((q) => {
                    q.whereNull('entity_id').orWhere({
                        entity_type: entityType,
                        entity_id: entityId,
                    });
                })
                .forUpdate()
                .select('id', 'storage_key');

            const foundKeys = new Set(media.map((row) => row.storage_key));
            if (keys.some((key) => !foundKeys.has(key))) {
                throw new AppError(
                    'One or more files are invalid or were not uploaded by this account.',
                    403,
                    'UPLOAD_OWNERSHIP_REQUIRED',
                );
            }

            const count = await trx('media_files')
                .whereIn('id', media.map((row) => row.id))
                .update({
                    entity_type: entityType,
                    entity_id: entityId,
                    ...(isSensitive === undefined ? {} : { is_sensitive: Boolean(isSensitive) }),
                    updated_at: new Date(),
                });
            return Number(count || 0);
        });
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.warn({ err, scope, academyId, entityType, entityId }, 'Failed to attach upload metadata to entity');
        throw new AppError(
            'Upload metadata could not be verified. Please upload the file again.',
            503,
            'UPLOAD_METADATA_UNAVAILABLE',
        );
    }
}

async function getUpload(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!isSafeStorageKey(normalized)) return null;
    if (env.STORAGE_PROVIDER === 's3') {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const client = await s3Client();
        const object = await client.send(new GetObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: normalized,
        }));
        const body = object.Body?.pipe
            ? object.Body
            : Readable.fromWeb(object.Body);
        return {
            type: 'stream',
            body,
            contentType: object.ContentType,
            contentLength: object.ContentLength,
        };
    }

    const requestedPath = path.resolve(uploadsRoot, normalized);
    if (!requestedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        return null;
    }
    try {
        const [realRoot, realRequestedPath] = await Promise.all([
            fs.realpath(uploadsRoot),
            fs.realpath(requestedPath),
        ]);
        if (!realRequestedPath.startsWith(`${realRoot}${path.sep}`)) return null;
        return { type: 'file', path: realRequestedPath };
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
}

module.exports = {
    attachMediaToEntity,
    findUploadMetadata,
    getUpload,
    putUpload,
    storageKeyFromUrl,
    uploadsRoot,
};
