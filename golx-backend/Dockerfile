FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY requirements-models.txt ./
RUN python3 -m venv /opt/goalix-model-venv \
    && /opt/goalix-model-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/goalix-model-venv/bin/pip install --no-cache-dir -r requirements-models.txt

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PYTHON_BIN=/opt/goalix-model-venv/bin/python
ENV PATH=/opt/goalix-model-venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies and source files with ownership
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=deps /opt/goalix-model-venv /opt/goalix-model-venv
COPY --chown=node:node package.json package-lock.json* ./
COPY --chown=node:node . .

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
