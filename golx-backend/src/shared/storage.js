const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const env = require('../config/env');

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

async function putUpload({ scope, academyId, extension, buffer, contentType }) {
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const key = uploadKey(scope, academyId, storedName);

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
        return { key, url: publicUploadUrl(key) };
    }

    const localPath = path.join(uploadsRoot, key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, buffer);
    return { key, path: localPath, url: publicUploadUrl(key) };
}

async function getUpload(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
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
    return { type: 'file', path: requestedPath };
}

module.exports = {
    getUpload,
    putUpload,
    uploadsRoot,
};
