FROM node:22-alpine

WORKDIR /workspace

# 1. Copy and install shared @mathquest/db package
COPY packages/db/package*.json ./packages/db/
RUN cd packages/db && npm install --omit=dev

COPY packages/db ./packages/db

# 2. Copy and install decision-api dependencies (resolves file:../../../packages/db)
COPY services/pedagogical-engine/decision-api/package*.json ./services/pedagogical-engine/decision-api/
WORKDIR /workspace/services/pedagogical-engine/decision-api
RUN npm install --omit=dev

# 3. Copy decision-api source code
COPY services/pedagogical-engine/decision-api ./

EXPOSE 5002

CMD ["npm", "run", "dev"]
