FROM node:22-alpine

WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
