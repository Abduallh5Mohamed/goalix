#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const forbiddenPatterns = [
  /(^|\/).*\.(sql|dump|backup)(\.(gz|zip|7z|bz2|xz))?$/i,
  /(^|\/)(?:\.codex[^/]*|[^/]+)\.(?:out\.)?log$/i,
  /(^|\/)\.codex-logs\//i,
  /(^|\/)test-results\//i,
  /(^|\/)(?:uploads|db-dumps)\//i,
  /(^|\/).*mfa.*qr.*\.(?:png|jpe?g|webp|svg)$/i,
  /(^|\/)\.env(?:\..+)?$/i,
];
const allowedPatterns = [
  /(^|\/)\.env\.example$/i,
];

let tracked = '';
try {
  tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
} catch {
  console.error('Could not inspect tracked files with git ls-files.');
  process.exit(1);
}

const offenders = tracked
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => {
    const normalized = file.replace(/\\/g, '/');
    if (allowedPatterns.some((pattern) => pattern.test(normalized))) return false;
    return forbiddenPatterns.some((pattern) => pattern.test(normalized));
  });

if (offenders.length) {
  console.error('Sensitive or generated artifacts are tracked by git. Remove them before committing:');
  offenders.forEach((file) => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('No forbidden sensitive/generated artifacts are tracked.');
