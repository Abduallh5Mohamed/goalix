#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

function printHelp() {
    console.log(`
Usage:
  npm run backup:db

Required:
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

Optional:
  BACKUP_DIR=backups

Notes:
  - Requires pg_dump to be installed on the machine running this script.
  - The database password is passed through PGPASSWORD, not as a command argument.
  - Output is a PostgreSQL custom-format dump plus a .sha256 checksum file.
`.trim());
}

function fail(message) {
    console.error(`Backup failed: ${message}`);
    process.exit(1);
}

function parseDatabaseUrl(value) {
    let parsed;
    try {
        parsed = new URL(value);
    } catch (_err) {
        fail('DATABASE_URL is not a valid URL.');
    }

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
        fail('DATABASE_URL must use postgres:// or postgresql://.');
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!parsed.hostname || !parsed.username || !database) {
        fail('DATABASE_URL must include host, user, and database name.');
    }

    return {
        host: parsed.hostname,
        port: parsed.port || '5432',
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password || ''),
        database,
    };
}

function safeFilePart(value) {
    return String(value || 'database').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
}

function runPgDump({ connection, outputFile }) {
    const args = [
        '-h',
        connection.host,
        '-p',
        connection.port,
        '-U',
        connection.user,
        '-d',
        connection.database,
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        '--file',
        outputFile,
    ];

    const child = spawn('pg_dump', args, {
        env: {
            ...process.env,
            PGPASSWORD: connection.password,
        },
        stdio: ['ignore', 'inherit', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        process.stderr.write(text);
    });

    return new Promise((resolve, reject) => {
        child.on('error', (err) => {
            reject(new Error(`Could not start pg_dump. Is PostgreSQL client installed? ${err.message}`));
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`pg_dump exited with code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`));
        });
    });
}

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printHelp();
        return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        fail('DATABASE_URL is required.');
    }

    const connection = parseDatabaseUrl(databaseUrl);
    const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(
        backupDir,
        `golx_${safeFilePart(connection.database)}_${timestamp}.dump`,
    );

    await mkdir(backupDir, { recursive: true });
    await runPgDump({ connection, outputFile });

    const checksum = await sha256File(outputFile);
    await writeFile(`${outputFile}.sha256`, `${checksum}  ${path.basename(outputFile)}\n`, 'utf8');

    console.log(`Backup written: ${outputFile}`);
    console.log(`SHA256: ${checksum}`);
}

main().catch((err) => fail(err.message));
