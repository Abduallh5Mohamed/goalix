# GOALIX GitHub Actions Docker Deploy

This workflow deploys the production Docker stack automatically after a push to `main`.

## Server Prerequisites

On the VPS, install:

- Git
- Docker Engine
- Docker Compose plugin

Clone the repository once:

```bash
git clone <your-repo-url> /opt/goalix
cd /opt/goalix
```

Create the production `.env` on the server only. Do not commit it:

```bash
POSTGRES_PASSWORD=change-me
JWT_SECRET=change-me-32-characters-minimum
JWT_REFRESH_SECRET=change-me-32-characters-minimum
COOKIE_SECRET=change-me-32-characters-minimum
TOTP_ENCRYPTION_KEY=base64-32-byte-key
CORS_ORIGINS=https://your-domain.com
MFA_ENFORCED_ROLES=admin,coach
HTTP_PORT=80
```

Run the first deploy manually once:

```bash
bash scripts/deploy-production.sh
```

## GitHub Secrets

Add these secrets in GitHub:

- `VPS_HOST`: server IP or hostname
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private SSH key allowed to connect to the VPS
- `VPS_APP_PATH`: project path on the VPS, for example `/opt/goalix`
- `VPS_PORT`: SSH port, optional; defaults to `22`

## Workflow

On every push to `main`:

1. GitHub validates `docker-compose.prod.yml`.
2. GitHub builds the production API and frontend images.
3. If the build passes, GitHub connects to the VPS over SSH.
4. The VPS pulls the latest `main`.
5. The VPS runs `scripts/deploy-production.sh`.
6. The script rebuilds Docker images, runs migrations through Compose, starts the stack, checks Postgres, Redis, API readiness, and Nginx health.

Production secrets stay on the VPS in `.env`.
