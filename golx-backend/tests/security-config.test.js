const { spawnSync } = require("node:child_process");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");

const requiredEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/goalix_test",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "test-jwt-secret-with-at-least-32-chars",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32",
};

const productionSecurityEnv = {
  COOKIE_SECRET: "production-cookie-secret-with-at-least-32-chars",
  CSRF_SECRET: "production-csrf-secret-with-at-least-32-chars",
  TOTP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  CORS_ORIGINS: "https://app.goalix.local",
};

function runNode(script, env = {}) {
  const childEnv = {
    ...process.env,
    ...requiredEnv,
    ...env,
  };
  for (const [key, value] of Object.entries(childEnv)) {
    if (value === null) delete childEnv[key];
  }

  return spawnSync(process.execPath, ["-e", script], {
    cwd: backendRoot,
    env: childEnv,
    encoding: "utf8",
  });
}

describe("security configuration", () => {
  it("allows the development cookie secret fallback for local startup only", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "development",
      COOKIE_SECRET: null,
    });

    expect(result.status).toBe(0);
  });

  it("rejects the default cookie secret in production", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      COOKIE_SECRET: null,
      CSRF_SECRET: "production-csrf-secret-with-at-least-32-chars",
      TOTP_ENCRYPTION_KEY: productionSecurityEnv.TOTP_ENCRYPTION_KEY,
      CORS_ORIGINS: "https://app.goalix.local",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("COOKIE_SECRET");
  });

  it("allows only configured production CORS origins", () => {
    const result = runNode(
      [
        "const { isAllowedOrigin } = require('./src/config/cors');",
        "if (!isAllowedOrigin('https://app.goalix.local')) process.exit(1);",
        "if (isAllowedOrigin('https://evil.example')) process.exit(2);",
      ].join(""),
      {
        NODE_ENV: "production",
        ...productionSecurityEnv,
      },
    );

    expect(result.status).toBe(0);
  });

  it("requires a TOTP encryption key in production", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      COOKIE_SECRET: "production-cookie-secret-with-at-least-32-chars",
      CSRF_SECRET: "production-csrf-secret-with-at-least-32-chars",
      TOTP_ENCRYPTION_KEY: null,
      CORS_ORIGINS: "https://app.goalix.local",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("TOTP_ENCRYPTION_KEY");
  });

  it("requires an explicit CSRF secret in production", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      ...productionSecurityEnv,
      CSRF_SECRET: null,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("CSRF_SECRET");
  });

  it("requires strong bcrypt rounds in production", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      ...productionSecurityEnv,
      BCRYPT_ROUNDS: "10",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("BCRYPT_ROUNDS");
  });

  it("rejects matching JWT access and refresh secrets", () => {
    const result = runNode("require('./src/config/env')", {
      JWT_REFRESH_SECRET: requiredEnv.JWT_SECRET,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("JWT_REFRESH_SECRET");
  });

  it("requires separate production secrets for JWT, cookies, and CSRF", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      ...productionSecurityEnv,
      CSRF_SECRET: productionSecurityEnv.COOKIE_SECRET,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("SECURITY_SECRETS");
  });

  it("rejects localhost CORS origins in production", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      ...productionSecurityEnv,
      CORS_ORIGINS: "http://localhost:3001",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("CORS_ORIGINS");
  });

  it("rejects non-HTTPS production CORS origins", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "production",
      ...productionSecurityEnv,
      CORS_ORIGINS: "http://app.goalix.local",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("CORS_ORIGINS");
  });

  it("rejects S3 upload storage without required credentials", () => {
    const result = runNode("require('./src/config/env')", {
      NODE_ENV: "development",
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: null,
      S3_ACCESS_KEY_ID: null,
      S3_SECRET_ACCESS_KEY: null,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toContain("S3 storage requires");
  });
});
