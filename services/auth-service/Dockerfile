FROM node:22-alpine

WORKDIR /workspace

# 1. Copy and install shared @mathquest/db package
COPY packages/db/package*.json ./packages/db/
RUN cd packages/db && npm install --omit=dev

COPY packages/db ./packages/db

# 2. Copy and install auth-service dependencies (resolves file:../../packages/db)
COPY services/auth-service/package*.json ./services/auth-service/
WORKDIR /workspace/services/auth-service
RUN npm install --omit=dev

# 3. Copy auth-service source code
COPY services/auth-service ./

EXPOSE 5000

CMD ["npm", "run", "dev"]
