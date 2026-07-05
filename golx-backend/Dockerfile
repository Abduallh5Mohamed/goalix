FROM node:20-bookworm-slim AS base

WORKDIR /app

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHON_BIN=/opt/goalix-python/bin/python \
    RANKING_PYTHON_BIN=/opt/goalix-python/bin/python \
    INJURY_RISK_PYTHON_BIN=/opt/goalix-python/bin/python \
    RANKING_MODEL_DIR="/app/Models/Ranking Model" \
    INJURY_RISK_MODEL_DIR=/app/Models

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY golx-backend/package.json golx-backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY Models/requirements.txt ./Models/requirements.txt
RUN python3 -m venv /opt/goalix-python \
    && /opt/goalix-python/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/goalix-python/bin/pip install --no-cache-dir -r ./Models/requirements.txt

COPY --chown=node:node golx-backend/ ./
COPY --chown=node:node Models/ ./Models/

RUN test -f "./Models/Ranking Model/football_ranking_model.pkl" \
    && test -f "./Models/football_academy_injury_risk_model_v3.joblib" \
    && test -f "./Models/inference_football_academy_injury_risk_v3.py" \
    && install -d -o node -g node ./uploads

EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
